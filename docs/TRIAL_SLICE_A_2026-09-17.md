# Self-serve trial, slice A. Build record. September 17, 2026.

Branch `trial-2026-09-17`, off `main` at `1e81e60` (prompts 0 and 1 merged).
Nine commits, one per build step, then this document. Skeleton:
`docs/SELF_SERVE_SKELETON_2026-09-17.md`; recon:
`docs/SELF_SERVE_RECON_2026-09-17.md`; prompts:
`docs/SELF_SERVE_BUILD_A_2026-09-17.md`.

Preview: https://basalith-official-2k0yw3gtn-dr-evil-pork-bellys-projects.vercel.app

Full local suite: 33 files, 642 passed, 2 skipped (the two crons named in
`lib/cronGates.test.ts`). `tsc` clean apart from the five pre-existing
`lib/frozenLayer.test.ts` errors, untouched since September 10. `next build`
exit 0.

## Where the build departed from the prompt, and why

- **B2 exclusion on the verify half too.** The prompt lists the sync's
  `load-terminated-archives` step; the verify function has a twin, and its
  purpose is to keep never-copied objects out of `A1_MISSING_IN_DEST`. A
  trial's objects are never copied by design, so excluding them from the sync
  alone would make every trial with one voice turn fail the Sunday verify
  (hard alarm, three emails per Sunday). Skeleton 1.6 says "pass both
  lists." Both loads read trials.
- **`excludedArchiveIds` is optional on the type.** The prompt says
  `string[]`. `applyArchiveScope(objects, scope = {})` has a defaulted second
  argument and the tests call it with no scope; a required field would break
  that shape. The three production call sites pass it explicitly, which is
  what the prompt asked for.
- **The second `no_pairs` miss shows the client's existing not-ready line**
  ("Your deposits are still being scored. Give it a few minutes and come
  back."), not the server's `NOTES[1]`. `NOTES` is not exported from
  `lib/foundingProof.ts`, and importing that module into a client component
  would pull the Anthropic SDK and the admin client into the browser bundle.
  The client line is the one that rendered for `ready: false` before this
  slice.
- **`/begin` carries one footer link** beyond section 6: "Already have an
  archive? Sign in" (public) or "Not you? Sign out" (signed in). Section 6
  names the fields, heading, body, button, and the line under the button;
  it does not forbid a way out for someone on the wrong address.

## Files

New

| File | What |
|---|---|
| `supabase/migrations/20260917_trial_archives.sql` | Three nullable columns on `archives` and a partial index. Pasted by hand. |
| `lib/trial.ts` | `TRIAL_DAYS`, `deriveFamilyName`, `trialWindow`, `isTrial`, `canShowProof`. Pure. |
| `lib/trial.test.ts` | Six tests. |
| `lib/auth/getOrCreateAuthUser.test.ts` | Five tests on a recorded admin client; the default path never calls update when a role exists. |
| `lib/internalNotify.ts` | `notifyInternal`: Basalith <davidha@basalith.xyz> to mrdavidha@gmail.com plus ADMIN_EMAIL, both scopes. |
| `app/api/trial/start/route.ts` | POST. Rate limit, email shape, auth user with `forceRole`, one archive per `owner_user_id`, the trial row, the lead row, the Trial started notice under `after()`. No OTP. |
| `app/begin/page.tsx` | Server. Owner with an archive to the dashboard; signed in without one gets the form minus email; else the public form. |
| `app/begin/BeginClient.tsx` | The three states, section 6 copy verbatim, `/archive-login` shell and classes, OTP via `signInWithOtp` with `shouldCreateUser: false`, resend after 30 seconds. |
| `lib/cronGates.test.ts` | Every `app/api/cron/*/route.ts` that reads `archives` must filter `status = 'active'`; the sweep pinned by name. |

Changed

| File | What |
|---|---|
| `lib/foundingSequence.ts` | Re-exports `canShowProof`. |
| `lib/auth/getOrCreateAuthUser.ts` | `options.forceRole`; one condition, `options.forceRole \|\| !match.app_metadata?.role`. Default path unchanged. |
| `app/api/archive/founding/proof/route.ts` | Gate is `canShowProof(status)`; 409 "Finish the first call first." |
| `app/archive/founding/FoundingClient.tsx` | Proof card in the call-just-closed and begin-next-call panels above the Begin button when `canShowProof`; kept on the completed panel; "One moment" and one retry after 5000 ms on `no_pairs`; the section 6 line under the card on a trial, no button. |
| `app/archive/founding/page.tsx` | Reads `status`, passes `trial`; zero-archive redirect to `/begin?signed_in=1`. |
| `app/archive/dashboard/page.tsx` | Zero-archive redirect to `/begin?signed_in=1`. |
| `app/archive/dashboard/DashboardClient.tsx` | Contributors card replaced on a trial by "Invite family once your archive is founded."; passes `trial` to the banner. |
| `app/archive/components/FoundingBanner.tsx` | `trial` prop; headline "Your first call is ready." on a trial with no call completed. |
| `lib/inngest/coverageFunctions.ts` | `coverageMonthlySweep` selects `status = 'active'`. |
| `lib/storageBackup.ts` | `ArchiveScope.excludedArchiveIds`; `applyArchiveScope` drops either list (`droppedExcluded`); `buildSnapshotEntries` takes the union. |
| `lib/inngest/storageBackupFunctions.ts` | `load-trial-archives` step in the sync and the verify, throws on a failed read, list passed to the scope and the snapshot. |
| `lib/storageBackup.test.ts` | Skeleton 1.6 test; the snapshot source pin moved to the three-argument call. |
| `lib/foundingProof.test.ts` | One test through `canShowProof`. |
| `app/api/archive/b2b-question/answer/route.ts` | Call 1 complete internal notice inside the founding `after()`; the call 3 internal send on `notifyInternal`. Owner email untouched. |
| `CLAUDE.md` | Section 4 trial paragraph; section 6 backup cron sentence corrected. |

Not in this branch, on purpose: the four untracked `docs/*.md` from the
recon and skeleton sessions (`BACKUP_CRON_RESTORE`, `SELF_SERVE_BUILD_A`,
`SELF_SERVE_RECON`, `SELF_SERVE_SKELETON`). They predate the branch and are
the founder's to commit.

## The migration to paste

Before the preview test. `supabase/migrations/20260917_trial_archives.sql`:

    alter table archives
      add column if not exists trial_expires_at timestamptz,
      add column if not exists trial_started_at timestamptz,
      add column if not exists converted_at timestamptz;

    create index if not exists archives_trial_expires_idx
      on archives (trial_expires_at)
      where status = 'trial';

    comment on column archives.trial_expires_at is
      'Set on trial creation to trial_started_at + 30 days. Cleared on conversion. The deletion job selects on it.';

Confirm after paste:

    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_name = 'archives'
      and (column_name like 'trial%' or column_name = 'converted_at');

Expected: three rows, all `timestamp with time zone`, all `YES`. Until this
is pasted, `POST /api/trial/start` fails at the archive insert (unknown
column) and answers 500; nothing else in the slice depends on the columns.

## Preview test script (skeleton 1.9, steps 1 through 7)

Paste the migration first. Then on the preview, with a fresh mailbox you
control (not one that owns or contributes to any archive):

1. /begin. Fill it in. Submit. Internal "Trial started" email arrives.
2. The sign-in link arrives. Click it. Land on /archive/dashboard with the
   Founding banner at the top. No loop.
3. Begin call 1. Answer to completion (10 to 25 turns, one voice turn).
4. The proof card renders in the post-call panel. One grounded panel with
   your opener answered and the deposit under it, one declined. Internal
   "Call 1 complete" email arrives.
5. Reload. Card still there. Begin call 2 is offered.
6. Sign out, sign in again with the same link flow. Dashboard, not /begin.
7. A second mailbox that is already a contributor on Cindy's archive: run
   /begin. The link signs in and lands on the dashboard (role forced to
   owner). my-archives shows both the owned trial and the contributed
   archive.

## Pasted rows (skeleton 1.9, verbatim)

    select id, status, tier, owner_email, owner_user_id, trial_started_at,
           trial_expires_at, entity_pipeline
    from archives where status = 'trial' order by created_at desc;

    select id, status, state->'founding' as founding,
           jsonb_array_length(state->'probeHistory') as turns
    from incident_sessions where archive_id = '<trial>' order by created_at desc;

    select count(*) filter (where included_in_training) as included, count(*) as pairs
    from training_pairs where archive_id = '<trial>';

    select id, email, status, apply_type, referral_source
    from archive_applications where email = '<trial email>';

    select id from profiles where id = '<owner_user_id>';

    select raw_app_meta_data->>'role' as role from auth.users where id = '<owner_user_id>';

And for the B2 gate, after sending `storage/backup.sync.requested` by hand
on the preview's Inngest environment (or waiting for the cron once merged):

    select bucket, path from storage_backup_objects
    where archive_id = '<trial>';
    -- expected: zero rows

    select kind, started_at, ok, objects_source, objects_copied
    from storage_backup_runs order by started_at desc limit 2;

A caution on that last step, from CLAUDE.md section 6: a `vercel` preview
deploy repoints the production Inngest app at the preview URL until the next
production deploy syncs it back. This preview has done that. Send no
Inngest events from the dashboard until the promote has landed and the app
page reads `https://basalith.ai/api/inngest` again; then the B2 gate query
reads the first 04:00 UTC sync after promote.

## Rollback

`vercel rollback`. The migration is additive (three nullable columns and a
partial index) and stays; nothing on main before this branch reads them. A
trial archive created on the preview stays in the database with
`status = 'trial'` and is invisible to every cron and to the backup; delete
it by hand per skeleton 1.9's last paragraph (`email_replies` first, then the
`archives` row, the Storage prefix, the `profiles` row, the auth user) or
leave it for slice B's job to prove itself on.

## Known limits

- **No deletion.** Nothing removes a trial at thirty days until slice B. No
  copy says "deleted after 30 days" (skeleton 2.2).
- **No payment.** The line under the proof card has no button until slice C.
  A trial that wants to pay today goes through the founder.
- **The rate limit on `/api/trial/start` is in-memory per lambda instance**
  (recon C5): five per IP per hour per warm instance. A cost guard. The
  mailbox check is Supabase's OTP.
- **One archive row per unproven mailbox.** A typo or a bot that submits the
  form creates an auth user, a `profiles` row (the `on_auth_user_created`
  trigger), an `archives` row, and an `archive_applications` row before any
  link is clicked. Skeleton 5.1 accepts this; slice B collects it.
- **Contributors cannot be invited from a trial, and uploads are refused**
  (skeleton 5.2). The three refusing surfaces are unchanged.
- **`app/begin/tier`, `details`, `review`, `confirmed` are an older, unlinked
  funnel** that predates this slice, with stale prices and a browser-side
  insert into a `signups` table. `/begin` now sits above them. They are not
  part of this branch; retiring them is its own commit.
- **`archive_applications` insert is log-and-continue.** If it fails the
  archive still exists and the person still signs in; the lead row is
  bookkeeping.
- **The proof's "One moment" retry is one retry.** A second `no_pairs`
  shows the not-ready line; the owner clicks Show me again later.
- **`monthly-accuracy` still emails the retired number** to every active
  owner. Not a trial concern (a trial is not active); flagged September 17
  for its own cycle.
