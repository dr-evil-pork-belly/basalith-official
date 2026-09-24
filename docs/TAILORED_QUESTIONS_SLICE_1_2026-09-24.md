# Tailored questions, slice 1: record threads. September 24, 2026.

Design and decisions: `docs/TAILORED_QUESTIONS_2026-09-24.md` (project copy
`claude/BASALITH_TAILORED_QUESTIONS_2026-09-24.md`). This slice is build order
step 0 (recon) and step 1 (threads, write-only). Nothing is served to an owner.

Written to disk in basalith-official by Cowork, uncommitted.

## Step 0, recon findings

Read from the code on disk today, not from live data.

1. **The question-to-deposit link is fixed in code.** `selectNextQuestion`
   returns `questionHistoryId`, `email_reply_sessions.question_history_id`
   carries it, and `app/api/resend/inbound/route.ts` updates that exact row,
   falling back to the old 14-day guess only for pre-column sessions. Pinned by
   `inbound-question-link.test.ts`. CLAUDE.md section 6 said otherwise; it now
   carries a dated UPDATE. Whether live rows populate has not been measured. The
   read is below.
2. **Reply tokens expire in code** (30 days, fail closed). Same kind of stale
   CLAUDE.md paragraph, same annotation.
3. **New bug, not fixed here.** The inbound handler calls `classifyDeposit` as
   `void`, which dies on lambda freeze. Email-reply deposits may have no domain
   scores. One-line move to `after()`, but it touches a route with five test
   files, so it is its own slice. This slice does not depend on it: the thread
   sweep reads every deposit through its own ledger.
4. **The `question_history.source` CHECK is unread.** It gates slice 3, which
   adds a `tailored` generator. Read it now with query B below.
5. **owner_deposits is append only** (20260921, 20260922). A deposit disappears
   only when its whole Basalith is deleted. That is what makes `deposit_ids
   uuid[]` with no FK safe: threads cascade from `archives` in the same statement.

## Step 0, live results (pasted September 24, 2026)

- Migration applied. RLS on both tables; anon and authenticated hold no select
  and no execute on the three functions. `pending_thread_extractions(1000)`
  returned 172.
- Query A, last 45 days: `daily_email` 262 served, 2 linked, last served
  2026-09-24 08:00 UTC. No other channel has a row. The daily email is not
  producing answers, which confirms decision 4 (dashboard card).
- Reply sessions, last 45 days: `owner_daily` 92 sent, 2 replied, 92 of 92 carry
  `question_history_id`. The link works: 2 replies, 2 linked rows. Owners are not
  answering. Open, not blocking: `question_history` shows 262 serves but only 92
  reply sessions, so about 170 serves have no email session behind them. Either the
  serve is recorded when no email goes out, or those emails go out under another
  `email_type`. Recon before slice 3, because served-but-never-sent rows feed the
  30-day unanswered cooldown.
- Query B: `question_history_source_check` allows only `p0`, `p1`, `p2`, `p3`.
  `question_history_channel_check` allows `daily_email`, `mirror_thread`,
  `app_companion`, `app_spark`, `founder_web`. Slice 3 must widen both in a
  migration before the first tailored serve (a new source value for tailored
  questions and a channel for the dashboard card). Without that the insert
  fails and only `console.warn`s, and the A/B measures nothing.

## What this slice adds

New
- `supabase/migrations/20260924_record_threads.sql`: `record_threads`,
  `record_thread_extractions` (the ledger), and three service-role functions:
  `upsert_record_thread` (atomic merge on archive plus normalized label; a
  second mention appends the deposit id, keeps the first quote, keeps the
  heavier weight, never touches status, so a muted thread stays muted),
  `record_thread_extraction` (success or error, attempts counted), and
  `pending_thread_extractions` (active Basaliths, owner deposits only, no eval
  holdout, no test artifact, no empty response, errored rows retried until
  three attempts). RLS on, service-role policy, `REVOKE ALL` from anon and
  authenticated on both tables and all three functions.
- `lib/threadExtract.ts`: the Haiku extractor and the code that decides
  everything the model can get wrong. A thread survives only if its quote is a
  literal span of the deposit (case, whitespace, and quote-mark tolerant, stored
  exactly as written), its kind is one of seven, its label is 8 words or fewer,
  and its quote is 8 characters to 40 words. Domain hints outside the scope's
  eight areas become null. Max six per deposit. Quotes are never taken from the
  prompt, only the answer. Kill switch `THREAD_EXTRACTION=on`.
- `lib/threadExtract.test.ts`: 29 tests, including the permanent boundary: ten
  files on the evidence path (entity prompt, entity context, verifier, frozen
  layer, saturation, founding proof, family entity, coverage run, both chat
  routes) must never mention the thread tables or module.
- `lib/inngest/threadFunctions.ts`: `thread-extraction-sweep`, hourly at :17,
  40 deposits a run, one step per deposit, concurrency 1.
- `scripts/backfill-threads.ts`: dry run, `--commit`, `--report`, one Basalith
  at a time, no status gate so a test Basalith can be read before it is live.

Changed
- `app/api/inngest/route.ts`: registers the sweep.
- `lib/cronGates.test.ts`: pins that the sweep reads archives only through
  `pending_thread_extractions` and that its SQL filters `a.status = 'active'`.
- `CLAUDE.md`: record threads paragraph in section 4; dated UPDATE notes on the
  two stale section 6 items.

Not touched: every deposit route, `classifyDeposit`, `selectNextQuestion`, the
incident engine, any surface.

## Verified in Cowork before handoff

- `tsc --noEmit` on the five new and changed TypeScript files: clean.
- `vitest run lib/threadExtract.test.ts lib/cronGates.test.ts`: 52 passed, 2
  skipped (the two named cron skips).
- The migration on a throwaway Postgres 16 with a stub schema, the live
  append-only trigger, and Supabase-style default grants: applies clean, re-paste
  clean; pending returns only the eligible owner deposits; merge, weight, domain
  fill, and deposit dedupe behave; an errored deposit retries until three
  attempts then stops; anon and authenticated hold no table or execute
  privilege; service_role executes; a muted thread stays muted; a direct deposit
  delete is still refused; deleting the Basalith cascades threads and ledger to
  zero.

Not verified: the full repo `tsc` and `npm test`, and anything live. Those are
yours.

## Run order

1. **Paste the migration** into the Supabase SQL editor. Then run the three
   PROVE IT queries at the bottom of the file and paste the output.

2. **Read the two things slice 3 needs** (read-only):

   Query A, is the question link landing live:

       select channel, count(*) as served,
              count(answered_deposit_id) as linked,
              max(served_at) as last_served
       from question_history
       where served_at > now() - interval '45 days'
       group by channel;

   Query B, the CHECK on `source`:

       select conname, pg_get_constraintdef(oid)
       from pg_constraint
       where conrelid = 'question_history'::regclass and contype = 'c';

3. **Type-check and test** in the repo:

       npx tsc --noEmit
       npm test

   Expect only the five known `lib/frozenLayer.test.ts` tsc errors.

4. **Commit on a branch and ship.** Backend only and off by default, so it can go
   straight to production under the standing rule:

       git checkout -b threads-2026-09-24
       git add supabase/migrations/20260924_record_threads.sql lib/threadExtract.ts lib/threadExtract.test.ts lib/inngest/threadFunctions.ts scripts/backfill-threads.ts app/api/inngest/route.ts lib/cronGates.test.ts CLAUDE.md docs/TAILORED_QUESTIONS_2026-09-24.md docs/TAILORED_QUESTIONS_SLICE_1_2026-09-24.md
       git commit -m "Record threads, slice 1 of tailored questions: extractor, ledger, hourly sweep (off), backfill"
       git checkout main
       git merge --ff-only threads-2026-09-24
       git push origin main

   Then confirm the Inngest app page shows the new commit and
   `thread-extraction-sweep` is registered alongside the fifteen already there. No `vercel` preview
   first: a preview repoints the production Inngest app.

5. **Backfill your own Basalith and read it.** From the repo root:

       npx tsx scripts/backfill-threads.ts --archive a38e4503-c7d2-4af3-af8c-cacd66974e0b
       npx tsx scripts/backfill-threads.ts --archive a38e4503-c7d2-4af3-af8c-cacd66974e0b --commit

   The commit run prints the full report at the end. Read every thread against
   what you actually said. This is the gate for everything after it: if the
   threads are wrong or dull, the planner and writer cannot be better than them.
   Re-print any time with `--report`.

6. **Only after you have read them,** set `THREAD_EXTRACTION=on` in Vercel
   production env and redeploy so the hourly sweep covers every active Basalith.

## Rollback

Set `THREAD_EXTRACTION` off (or unset) and the sweep returns immediately. The
tables are inert: nothing reads them. To remove entirely:
`drop function pending_thread_extractions(integer), record_thread_extraction(uuid, uuid, text, integer, text), upsert_record_thread(uuid, text, text, text, text, smallint, text, uuid, text); drop table record_thread_extractions, record_threads;`

## Next

- Slice 2: the planner on the coverage map (`archive_coverage` replaces
  `deposit_domain_scores` density in `selectNextQuestion`).
- MOAFly Technologies Corporation needs a succession Basalith before slice 3.
  None exists yet; the Founder Test Archive (`6c0722d3`) is fixture material, not
  a real business. Provision it through the normal path when you are ready to
  run its founding calls.
- The `void classifyDeposit` fix in the inbound handler, as its own small slice.
