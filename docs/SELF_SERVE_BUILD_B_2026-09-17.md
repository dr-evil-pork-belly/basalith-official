# Self-serve trial, slice B: the deletion job. Build prompt. September 17, 2026.

Slice A is live (`docs/TRIAL_SLICE_A_2026-09-17.md`). The first trial,
archive `67e726d7-be23-45cb-aad4-41020f311a01`, expires October 18, 2026 at
03:31 UTC. This slice has to be live before then so that trial is deleted
on schedule by the job, not by hand. That is the best gate the job can have.

Standing rules as in slice A: no em dashes; American English; PowerShell;
`after()` for post-response writes in routes (none expected here); `vercel`
for preview only; no push, no merge; no credentials, no bypass secret, stop
and ask; pasted output is the gate.

## What the live reads settled (September 17, Supabase)

The cascade map. 51 tables carry `archive_id`. 50 have a foreign key to
`archives`: 49 `ON DELETE CASCADE`, `billing` `ON DELETE SET NULL`. The
two exceptions:

- `email_replies`: FK to `archives` and to `email_sessions`, both with no
  action. It blocks `delete from archives` until its rows are gone.
- `storage_backup_objects`: no FK, on purpose. The manifest outlives the
  archive. Never deleted by this job.

Second-hop tables (`labels`, `owner_deposits`, `voice_recordings`,
`archive_videos`, `archive_documents`, `question_history`,
`deposit_domain_scores`, `deposit_resurfacings`, `witness_deposits`,
`memory_game_*`, `contributor_*`, `successor_contexts`, `eval_results`,
`coverage_probe_results`) are all inside the cascade or keyed to `archives`
with CASCADE themselves. Postgres checks no-action FKs at statement end, so
after `email_replies` is cleared, one `delete from archives where id = $1`
is clean.

Outside the cascade: `archive_applications` (the trial row, keyed by email
and status, no FK), `profiles` (keyed by user id; `handle_new_user` creates
it), `auth.users` (`archives.owner_user_id` references it with no action,
so the archive row must go before the user can), Supabase Storage objects
under `{archiveId}/` in `photographs`, `voice-recordings`, `archive-videos`,
`archive-documents`, `archive-exports`. B2 holds nothing for a trial by
construction (slice A exclusion); the job asserts that rather than assumes
it.

---

## PROMPT

Paste into Claude Code in `basalith-official`:

You are building slice B of `docs/SELF_SERVE_SKELETON_2026-09-17.md`
(section 2), with the cascade map above replacing the skeleton's
"cannot be written until the map exists" caveat. Read the skeleton, then
`docs/TRIAL_SLICE_A_2026-09-17.md`, then `scripts/dissolution-purge.ts`,
`docs/DISSOLUTION_RUNBOOK.md` sections 4 and 1.6, `lib/storageBackup.ts`
(the ALLOWLIST and `archiveIdFromPath`), `lib/inngest/coverageFunctions.ts`
(the shape of a cron function in this repo), `lib/internalNotify.ts`,
`lib/emails/foundingSequenceComplete.ts` (email builder shape), and
CLAUDE.md. Where this prompt and the skeleton disagree, this prompt wins,
because it carries the live schema.

Branch: `git checkout main`, `git pull --ff-only`, `git checkout -b trial-expiry-2026-09-17`.
One commit per step. `npx tsc --noEmit` and the relevant tests before each
commit.

### Step 1. Migration

`supabase/migrations/20260917_trial_warned_at.sql`, additive, founder
pastes:

    alter table archives add column if not exists trial_warned_at timestamptz;
    comment on column archives.trial_warned_at is
      'Set when the day 23 trial warning email was sent. Idempotency key for trialWarn.';

### Step 2. The pure core: `lib/trialExpiry.ts`

No Supabase client in this file. Everything the job decides is a pure
function over rows the caller has already read, so it is testable without
a database.

- `WARN_DAYS_BEFORE = 7`. `warnWindow(now)`: returns the `[from, to)`
  pair `now + 6 days` to `now + 8 days` for the warn select.
- `selectTrialsToWarn(rows, now)`: `status === 'trial'`,
  `trial_warned_at === null`, `trial_expires_at` inside the window,
  `scheduled_deletion_at === null`.
- `selectTrialsToExpire(rows, now)`: `status === 'trial'`,
  `trial_expires_at < now`, `scheduled_deletion_at === null`.
  A converted trial has `status = 'active'` (slice C) and never selects.
  A trial the owner terminated by hand has `scheduled_deletion_at` set and
  takes the 365-day path that already exists; never both.
- `canDeleteAuthUser(input)`: takes `{ ownedArchives: number,
  contributorRows: number, successorRows: number, archivistRows: number }`
  and returns true only when all four are zero. The caller reads the four
  counts AFTER the archive row is deleted, so `ownedArchives` counts other
  archives only.
- `DELETE_ORDER` as a documented constant array of step names, in this
  order, so the test can pin it and the Inngest function iterates it:
  `mark_terminated`, `purge_storage`, `assert_no_b2`, `delete_email_replies`,
  `delete_application`, `delete_archive`, `maybe_delete_user`, `notify`.
- `lib/trialExpiry.test.ts`: at least 8 tests. Window arithmetic at the
  boundaries; each select predicate including the `scheduled_deletion_at`
  guard and the converted case; `canDeleteAuthUser` all four ways; the
  order constant.

### Step 3. Storage purge as a library

`lib/storagePurge.ts`: lift the object-deletion logic out of
`scripts/dissolution-purge.ts` into `purgeArchiveStorage(archiveId,
{ supabaseAdmin })`. Keep every safety property the script has: it refuses
unless `archives.termination_requested_at` is set (read it, throw if null);
it deletes only under the `{archiveId}/` prefix; it walks the five buckets
(`ALLOWLIST` from `lib/storageBackup.ts` plus `archive-exports`); it
returns per-bucket counts. The script becomes a thin caller that prints
what the lib returns. Print the diff of the script to prove nothing else
moved. If the script has a test, it must still pass; if it has none, add
`lib/storagePurge.test.ts` pinning the refusal on a null
`termination_requested_at` (mock the admin client the way
`getSessionUser.test.ts` does).

### Step 4. The two Inngest functions

`lib/inngest/trialFunctions.ts`. Register both in the Inngest client where
`coverageMonthlySweep` is registered, and print the function count the
`/api/inngest` route will report (13 today; 15 after).

`trialWarn`, id `trial-warn`, cron `0 15 * * *` (08:00 Pacific).
- Step `load`: select `id, name, owner_email, owner_name, trial_expires_at,
  trial_warned_at, scheduled_deletion_at, status, preferred_language` from
  `archives` where `status = 'trial'`. Filter with `selectTrialsToWarn`.
- One step per archive: read the deposit count, send the warning email
  (section 6 copy below), then
  `update archives set trial_warned_at = now() where id = $1 and trial_warned_at is null`.
  If the update affects zero rows (a concurrent run got there first), log
  and continue. Send before update is the right order here: an email that
  fails must not mark the row warned.
- Concurrency 1. Retries 2.

`trialExpire`, id `trial-expire`, cron `0 16 * * *` (09:00 Pacific).
- Step `load`: same select. Filter with `selectTrialsToExpire`.
- One `step.run` per `DELETE_ORDER` entry per archive, named
  `${step}:${archiveId}`, each idempotent:
  1. `mark_terminated`: `update archives set termination_requested_at = coalesce(termination_requested_at, now()) where id = $1`.
  2. `purge_storage`: `purgeArchiveStorage`. Record the counts.
  3. `assert_no_b2`: `select count(*) from storage_backup_objects where archive_id = $1`.
     If non-zero, STOP this archive (do not proceed to delete), send an
     internal notification "Trial has B2 objects, not deleted", and
     continue with the next archive. This is the invariant the slice A
     exclusion promised; a violation is a bug to look at, not a row to
     delete around.
  4. `delete_email_replies`: `delete from email_replies where archive_id = $1`.
  5. `delete_application`: `delete from archive_applications where email = $owner_email and status = 'trial'`.
  6. `delete_archive`: read `owner_user_id` and `owner_email` first (they
     are needed after), then `delete from archives where id = $1`. The
     cascade runs. Confirm afterward with a count on `owner_deposits`,
     `incident_sessions`, `training_pairs` for the id; all must be zero, and
     the step logs the three counts.
  7. `maybe_delete_user`: count `archives where owner_user_id = $uid`,
     `contributors where email = $email`, `successors where auth_user_id = $uid`,
     `archivists where auth_user_id = $uid` (confirm the column names by
     reading the tables' migrations or the recon; if any table lacks that
     column, say so and use the column it has). `canDeleteAuthUser` decides.
     If true: `delete from profiles where id = $uid`, then
     `supabaseAdmin.auth.admin.deleteUser($uid)`. If false: leave both and
     log why.
  8. `notify`: internal notification "Trial expired and deleted": archive
     id, the email's domain only (not the address), deposit count at
     deletion (read in step 6 before the delete), whether the user was
     deleted, the storage counts.
- Concurrency 1. Retries 2. A retry re-runs only the steps that did not
  complete; every step is written so a second execution is a no-op.

### Step 5. The warning email

`lib/emails/trialWarning.ts`, builder shape as the founding complete email.
Subject "Seven days left on your first call." Body, plain and HTML:

> Your archive at {archive name} holds {n} deposits from your first call.
> It is deleted on {date, long form, Pacific} unless you keep it.
>
> {keep line}
>
> {export line}

The keep line depends on what exists when this ships. Slice C (trial to
paid) is NOT live. So the keep line is: "Reply to this email and we will
keep it open while you decide." with `replyTo` set to the address
`ADMIN_EMAIL` resolves to. That is a real path: the founder reads that
mailbox. When slice C lands, this line becomes the Checkout button; note
that in a comment.

The export line: read whether an owner-facing export exists on the web
(`lib/archiveExportStorage.ts`, the `archive/export.requested` Inngest
function, any `app/api/archive/export` route or Settings link). If an
owner can request an export from the web today, link to it. If they cannot,
omit the line and say so in the build doc; do not link to a page that does
not exist.

Translate nothing; `preferred_language` is read but the email ships in
English in this slice, stated in known limits.

### Step 6. Probe script

`scripts/trial-expiry-probe.ts`, same shape as `scripts/gap-log-probe.ts`:
takes an archive id, refuses unless the row is `status = 'trial'` and
`trial_expires_at < now()`, prints the before counts (archives,
owner_deposits, incident_sessions, training_pairs, email_replies,
archive_applications, profiles, auth user present, storage objects per
bucket, storage_backup_objects), runs the SAME per-archive sequence the
Inngest function runs (extract it to `runTrialExpiryForArchive(archiveId,
deps)` in `lib/trialExpiryRunner.ts` so the function and the script share
one body), then prints the after counts. `--dry-run` prints the before
counts and the decision `canDeleteAuthUser` would make, and writes nothing.

### Step 7. Guards

- `lib/cronGates.test.ts` is unaffected (these are Inngest crons, not
  Vercel). Confirm it still passes and that neither new function selects
  `status = 'active'`, which would be wrong here.
- A test that `trialExpire` never selects an archive with
  `scheduled_deletion_at` set, and never one whose status is not `trial`.
- A test that the runner refuses to proceed past `assert_no_b2` when the
  count is non-zero (mocked).

### Step 8. CLAUDE.md

Section 4: one paragraph on the two crons, the delete order, the B2
assertion, the conditional user delete, and that the warning email's keep
line is a reply until slice C. Section 6 (crons list) if one exists.

### Step 9. Build doc, preview, output

- Full suite. Print the count.
- `vercel`. Print the URL.
- `docs/TRIAL_SLICE_B_2026-09-17.md`: files, the migration to paste, the
  probe instructions below verbatim, the production gate, rollback, known
  limits (English-only email; the keep line is a reply until slice C; the
  export line decision).
- `git status --short`. Stop. No merge, no push.

## The gate, in order

1. Founder pastes the migration.
2. Founder promotes (merge, push). Wait for Ready and the Inngest app page
   to show the merge commit and 15 functions. Note: the preview deploy
   repoints the production Inngest app; the promote puts it back.
3. On production, a throwaway trial: `/begin` with a mailbox that owns
   nothing (NOT davidharealestate@gmail.com; that trial is the October 18
   scheduled gate). Run call 1 with one voice turn so there is a Storage
   object to purge.
4. In the Supabase editor:
   `update archives set trial_expires_at = now() - interval '1 hour' where id = '<throwaway>';`
5. `npx tsx scripts/trial-expiry-probe.ts <throwaway> --dry-run`. Paste.
6. `npx tsx scripts/trial-expiry-probe.ts <throwaway>`. Paste before and
   after. Expected after: archives 0, deposits 0, incidents 0, pairs 0,
   email_replies 0, application 0, storage objects 0 in every bucket,
   storage_backup_objects 0 (was 0), profiles 0, auth user absent, internal
   email received.
7. Then the scheduled run proves itself on October 18 at 16:00 UTC against
   `67e726d7`, with the day-23 warning due October 11 at 15:00 UTC. Both
   are read afterward with the same counts. Until step 7 has happened, no
   copy on the site says "deleted after 30 days."

## Section 6 copy, approved September 17

Subject: Seven days left on your first call.

Your archive at {archive name} holds {n} deposits from your first call. It
is deleted on {date} unless you keep it.

Reply to this email and we will keep it open while you decide.

{Export line only if a real owner export exists.}
