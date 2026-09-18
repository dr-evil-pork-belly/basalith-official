# Self-serve trial, slice B. The deletion job. Build record. September 17, 2026.

Branch `trial-expiry-2026-09-17`, off `main` at `f6a0bb7` (slice A merged,
portal stone slice 1 on top). Nine commits, one per step, then this
document. Skeleton section 2 with the live cascade map from
`docs/SELF_SERVE_BUILD_B_2026-09-17.md` replacing its caveat. Slice A
record: `docs/TRIAL_SLICE_A_2026-09-17.md`.

Preview: https://basalith-official-k5txls8g3-dr-evil-pork-bellys-projects.vercel.app

Full local suite: 38 files, 678 passed, 2 skipped (the two crons named in
`lib/cronGates.test.ts`). `tsc` clean apart from the five pre-existing
`lib/frozenLayer.test.ts` errors. `next build` exit 0. The Inngest route
registers 15 functions (13 plus `trial-warn` and `trial-expire`).

The first live trial, `67e726d7-be23-45cb-aad4-41020f311a01`, expires
October 18, 2026 at 03:31 UTC. With this slice live, `trial-warn` mails it
October 11 at 15:00 UTC and `trial-expire` deletes it October 18 at 16:00
UTC. Both are read afterward with the same counts the probe prints.

## Where the build departed from the prompt

- **Step 5 is committed before step 4.** The Inngest function imports the
  email builder, so the builder had to exist first. Commit order is
  1, 2, 3, 5, 4, 6, 7, 8, 9.
- **The warning email states the day the job runs, not the raw expiry.** A
  trial expiring at 03:31 UTC is deleted by the 16:00 UTC run that day;
  `firstExpiryRunAfter` in `lib/trialExpiry.ts` computes it and
  `formatPacificDate` renders it. "Deleted on Sunday, October 18, 2026" is
  then what happens.
- **`mark_terminated` re-checks the row.** Beyond setting
  `termination_requested_at`, the first step refuses a row that is not
  `status = 'trial'`, has `scheduled_deletion_at` set, or has not expired.
  The cron's select already excludes those; the runner checks again so a
  hand-typed id in the probe, or a stale selection, can never delete a
  converted or owner-terminated archive.
- **`delete_archive` throws if the cascade leaves rows** in
  `owner_deposits`, `incident_sessions`, or `training_pairs`, rather than
  only logging the counts. A cascade that did not run is a red run.

## Files

New

| File | What |
|---|---|
| `supabase/migrations/20260917_trial_warned_at.sql` | One nullable column. Pasted by hand. |
| `lib/trialExpiry.ts` | Pure: `WARN_DAYS_BEFORE`, `warnWindow`, `selectTrialsToWarn`, `selectTrialsToExpire`, `canDeleteAuthUser`, `DELETE_ORDER`, `emailDomain`, `EXPIRE_RUN_UTC_HOUR`, `firstExpiryRunAfter`, `formatPacificDate`. |
| `lib/trialExpiry.test.ts` | Thirteen tests: window boundaries, every select predicate including the converted and owner-terminated cases, `canDeleteAuthUser` four ways, the order constant, the run date. |
| `lib/storagePurge.ts` | `purgeArchiveStorage(archiveId, { supabaseAdmin, dryRun, log })`, the runbook script's body: refuses without `termination_requested_at`, `{archiveId}/` prefix only, ALLOWLIST plus `archive-exports`, Storage API, post-delete walk, per-bucket counts. `walkPrefix` and `requireTerminated` exported. |
| `lib/storagePurge.test.ts` | Eight tests on an injected client, including the refusal on a null `termination_requested_at` touching no bucket. |
| `lib/emails/trialWarning.ts` | The day 23 email, section 6 copy verbatim. Keep line is a reply; export line links to `/archive/preferences`. |
| `lib/emails/trialWarning.test.ts` | Four tests including the copy-rule scan. |
| `lib/trialExpiryRunner.ts` | `runTrialExpiryForArchive(archiveId, deps)`, the one body the function and the script run, one step per `DELETE_ORDER` entry. |
| `lib/trialExpiryRunner.test.ts` | Six tests on a recorded client: the full order with storage purge, cascade, user delete and domain-only notice; the `assert_no_b2` stop; the kept-user case; the three refusals; the already-deleted no-op; `deleteUser` not-found tolerance. |
| `lib/inngest/trialFunctions.ts` | `trialWarn` (`0 15 * * *`) and `trialExpire` (`0 16 * * *`). Concurrency 1, retries 2. |
| `lib/inngest/trialFunctions.test.ts` | Source guards: reads `status = 'trial'` and never `'active'`, schedules, no event trigger, step naming, send before mark, `replyTo`, registration. |
| `scripts/trial-expiry-probe.ts` | The production gate. Refuses unless the row is an expired trial by the cron's predicate. Before counts, the `canDeleteAuthUser` decision, the run, after counts. `--dry-run` writes nothing. |

Changed

| File | What |
|---|---|
| `scripts/dissolution-purge.ts` | A thin caller of `lib/storagePurge.ts`. Argument parsing, client, and exit handling unchanged; `BUCKETS`, `walk`, `requireTerminated`, and the loop moved into the lib. Diff printed at step 3. |
| `app/api/inngest/route.ts` | Registers `trialWarn` and `trialExpire`. 15 functions. |
| `CLAUDE.md` | Section 4: the trial expiry paragraph. |

Not in this branch: the five untracked `docs/*.md` from the recon, skeleton,
build-prompt, and backup sessions. They predate the branch.

## The migration to paste

Before promote. `supabase/migrations/20260917_trial_warned_at.sql`:

    alter table archives add column if not exists trial_warned_at timestamptz;
    comment on column archives.trial_warned_at is
      'Set when the day 23 trial warning email was sent. Idempotency key for trialWarn.';

Confirm after paste:

    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_name = 'archives' and column_name = 'trial_warned_at';

Expected: one row, `timestamp with time zone`, `YES`. Until this is pasted,
both crons fail at their load step (unknown column) and delete nothing; the
probe script does not read the column and works without it.

## The gate, in order

1. Founder pastes the migration.
2. Founder promotes (merge, push). Wait for Ready and the Inngest app page
   to show the merge commit and 15 functions. Note: the preview deploy
   repoints the production Inngest app; the promote puts it back.
3. On production, a throwaway trial: /begin with a mailbox that owns
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
   67e726d7, with the day-23 warning due October 11 at 15:00 UTC. Both are
   read afterward with the same counts. Until step 7 has happened, no copy
   on the site says "deleted after 30 days."

Read after the scheduled runs, in the Supabase editor:

    select id, status, trial_expires_at, trial_warned_at
    from archives where id = '67e726d7-be23-45cb-aad4-41020f311a01';
    -- October 11 after 15:00 UTC: trial_warned_at set. October 18 after 16:00 UTC: zero rows.

And on the Inngest dashboard, the `trial-expire` run for October 18 with
its `mark_terminated:67e726d7…` through `notify:67e726d7…` steps green,
and the internal "Trial expired and deleted" email in the founder's inbox.

## Rollback

`vercel rollback`. The migration is additive (one nullable column) and
stays. A trial already deleted by the job is gone; that is the job. A
trial warned but not yet deleted keeps `trial_warned_at` set, which only
suppresses a second warning. If the job must be stopped without a
rollback, pausing `trial-expire` on the Inngest dashboard is enough: the
cron does not fire and nothing else selects on `trial_expires_at`.

## Known limits

- **English only.** `preferred_language` is read by the cron and not used
  by the email. The Cantonese path on the phone line is unaffected.
- **The keep line is a reply until slice C.** "Reply to this email and we
  will keep it open while you decide," with `replyTo` on `ADMIN_EMAIL`. The
  founder reads that box. Keeping a trial open is then a hand-run
  `update archives set trial_expires_at = ... where id = ...`; nothing in
  this slice automates it. Slice C replaces the line with the Checkout
  button.
- **The export line links to `/archive/preferences`**, where the owner
  export button lives today and does not refuse a trial. If that surface
  moves, the line moves with it.
- **A trial with no `owner_email` is never warned** (logged as skipped) and
  is still deleted on schedule.
- **The email domain in the internal notice** is all the notice carries
  about the person. The archive id is in it; the address is not.
- **`assert_no_b2` stops, it does not clean.** A trial that somehow reached
  B2 stays in the database with its Storage objects already purged and
  `termination_requested_at` set, and mails the founder every day at 16:00
  UTC until someone reads the manifest and decides. That repetition is
  deliberate: the exclusion in slice A promised zero, and a violation
  should not go quiet.
- **The probe subtracts one from `ownedArchives`** in its dry-run decision
  because the archive being deleted still exists at that point; the runner
  counts after the delete and needs no subtraction. Same answer, stated so
  nobody reads a difference into it.
- **No copy change.** Nothing on the site mentions 30 days until step 7 of
  the gate has run.
