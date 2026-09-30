# Run ledger, slice 1. September 30, 2026.

Phase 0 of the AI-native operating model: verification before anything else.
Project docs: claude/BASALITH_AI_NATIVE_OPERATING_MODEL_2026-09-30.md,
claude/BASALITH_VERIFICATION_RECON_2026-09-30.md.

State: written to disk, uncommitted. Not type-checked in this repo. Not
deployed. The migration is not pasted.

## Why

The recon found 26 scheduled jobs (20 Vercel crons, 6 Inngest crons) and one
pair, the storage backup, that can prove it ran. For the rest the only evidence
is a platform log, and a green platform status proves little: several crons
return a 200 "skipped" on an hour or day gate. The daily backup cron sat
undeployed from August 13 to September 17 and nothing noticed.

## What this slice is

One table and one wrapper, proven on one job. Nothing reads the ledger yet. It
is a record, not an alarm, until slice 2.

| File | Change |
|---|---|
| supabase/migrations/20260930_cron_runs.sql | New. Table cron_runs, RLS on, service_role only, REVOKE ALL. |
| lib/cronRun.ts | New. withCronRun(options, work, report). |
| lib/cronRun.test.ts | New. 9 cases. |
| app/api/cron/export-reaper/route.ts | One import, one call wrapped. Response body unchanged. |

## The contract

1. A row opens before the work and closes after. finished_at null long after
   started_at means the run died without unwinding.
2. outcome is 'ok' only when the job did its real work. A gate skip, a dry run,
   or a test call is 'skipped'.
3. The ledger never stops the job. If the row cannot be opened or closed, the
   failure is logged and the work runs anyway. So the deploy and the paste are
   safe in either order.
4. summary holds counts. Never names, emails, storage paths, or archive ids.

export-reaper is first because it is small, daily, and its own header says
silence is the failure that matters.

## Checked, and not checked

Checked in an isolated workspace, outside this repo: lib/cronRun.ts and its
test compile under strict TypeScript, and the 9 cases pass. That run used the
current TypeScript and vitest releases, not the versions pinned here.

Not checked: tsc in this repo, the route edit against app/api/cron/cron-auth.test.ts
(that file stubs supabase-admin; the wrapper catches a stub that runs out of
road, so it should hold, and that is a reading, not a run), the SQL against the
live database.

## Acceptance gate. Pasted output only.

1. Paste supabase/migrations/20260930_cron_runs.sql into the Supabase editor.
   Paste back the output of the three confirm queries at the bottom of the file.
   Expect: eight columns; no grant row for anon, authenticated, or PUBLIC; RLS
   true with one policy for service_role.

2. In the repo:

       npx tsc --noEmit
       npx vitest run lib/cronRun.test.ts app/api/cron/cron-auth.test.ts

   Expect zero tsc errors and both files green.

3. Commit these five files by name (no `git add .`) and promote.

4. After the next 03:00 UTC run, paste:

       select job, scheduler, started_at, finished_at, outcome, summary, error
       from cron_runs order by started_at desc limit 5;

   Expect one export-reaper row, outcome ok, finished_at set, summary with
   scanned, deleted, kept, dryRun false. To see a row the same day, call the
   route yourself with ?dryRun=1 and expect a 'skipped' row.

The design is frozen only after step 4 shows a real row. The other 25 jobs
adopt the wrapper after that, not before.

## Decisions taken September 30 (David: "go with your rec")

1. ADMIN_EMAIL is set in Vercel (Production and Preview, added April 23) and its
   value is hidden. It does not need to be revealed. Slice 2 sends every alarm
   through notifyInternal, which already reaches mrdavidha@gmail.com. The
   September 17 record notes alert mail landing in spam as of August 13.
2. The Wednesday verification cron does not exist. lib/verificationStore.ts says
   "nothing schedules this yet" and its only caller is
   scripts/coverage-fixture-probe.ts. The two-consecutive-Wednesdays clock on the
   verification surface has not started. It gets its own slice after slice 2.
3. pause-reminder, cold-storage-ping, family-reactions stay unscheduled. They
   are annotated, not deleted, and are decided with the Resting tier state work.
4. The four memory-game crons stay through the cohort. They adopt the ledger
   with the rest, and their send counts decide the question.
5. The gate before production is a pre-push command for now. It becomes a
   required check on main when a second person holds the production gate.

## Next slices

2. One heartbeat for every job, read from cron_runs, alarms through
   notifyInternal. onFailure on the Inngest crons. All 25 remaining jobs adopt
   the wrapper.
3. The weekly report.
4. An outside watcher for the heartbeat itself.
5. The pre-push gate command.
Then: the scheduled verification run.

## Seen in passing, not acted on

- ELEVENLABS_API_KEY is still set in Production and Preview. The subscription
  was cancelled in August. The voice-portrait header says a set key costs one
  model call per cloned archive if that route is ever invoked.
- GOD_MODE_PASSWORD carries Vercel's "Needs Attention" flag and is set for All
  Environments as a readable value. app/api/god exists. Not read in this slice.
