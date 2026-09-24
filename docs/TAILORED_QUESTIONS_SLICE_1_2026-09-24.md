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

## t1 read and t2 (same day)

The first backfill of the Dr Ha Basalith under t1: 106 deposits read, 0 errors,
139 threads, 4 invented quotes caught and dropped by the verbatim check. The
recurring decisions were the strongest material (walking away from a business
relationship even after repayment, extending credit and getting burned, letting a
son fail, cost against care when cash was tight, buying back the childhood
apartment complex). Five defects, all fixed in extractor t2:

1. Fragmentation. Cindy was seven threads, Kate four, Warren's Vegas birthday
   four, Lincoln Heights four, the molar five. Only about 6 of 145 mentions
   merged. t2 shows the model the Basalith's existing threads as T1, T2, ... and
   lets it attach a mention; a new person's label is only what the owner calls
   them; a "new" label that already exists is turned into a mention by code.
2. Trivia. Photo captions became threads (chocolate bars, sports on TV, a museum,
   a celebrity). t2 asks only for threads that carry a decision, a judgment, a
   turning point, or a relationship that shapes choices, and names what to skip.
3. Weight. Ambition and a zero-revenue startup were marked 3. t1's prompt said
   "when unsure, choose the heavier." t2 reserves 3 for a closed list and says
   ambition and money pressure are 2.
4. Health. Dental details were ordinary threads. t2 adds `sensitive` (health or
   medical or dental care, legal trouble, police, crime or fights, addiction,
   sex). A sensitive thread is never pushed by a daily question or named in an
   email.
5. No dates. A reversed decision (recruiting Guides) would read as current. t2
   records `first_said_at` and `last_said_at` from the deposits.

Coverage note from the read: threads only reflect what is in the deposits. The
Dr Ha record is mostly family and photo captions with one strong business
incident; real estate, the research, and the music barely appear. That is the gap
the planner aims at, not an extraction defect.

### t2 files

New: `supabase/migrations/20260924b_record_threads_t2.sql` (three columns,
`attach_record_thread`, new `upsert_record_thread` signature, `pending_thread_extractions`
now returns `created_at`, and the clear of the Dr Ha t1 read).
Changed: `lib/threadExtract.ts` (t2), `lib/threadExtract.test.ts` (36 tests),
`lib/inngest/threadFunctions.ts` (dates, created and attached counts),
`scripts/backfill-threads.ts` (dates and SENSITIVE in the report),
`lib/cronGates.test.ts` (pins the gate in the t2 migration).

Verified in Cowork: tsc clean with Next's `ProcessEnv` simulated; 59 tests pass
across the two files; the migration on throwaway Postgres 16 applies and
re-pastes clean, clears the t1 rows, returns `created_at`, widens dates, ORs
`sensitive`, maxes weight, does not duplicate a deposit on repeat, refuses an
attach across Basaliths, drops the old upsert signature, and leaves anon and
authenticated with no execute.

### t2 run order

1. Paste `20260924b_record_threads_t2.sql` into the SQL editor, then run its two
   PROVE IT queries and paste the output.
2. `npx tsc --noEmit 2>&1 | Select-String "error TS"` prints nothing, and
   `npm test` is green.
3. Commit on a branch, fast-forward main, push.
4. `npx tsx scripts/backfill-threads.ts --archive a38e4503-c7d2-4af3-af8c-cacd66974e0b --commit`
   and read the report again. Expect far fewer threads, one per person, dates
   on every line, SENSITIVE on the dental ones.
5. Only then `THREAD_EXTRACTION=on`.

## t2 read and backstop (same day)

The t2 backfill of the Dr Ha Basalith: 106 deposits, 66 threads (from 139), 63
mentions attached (from about 6), every thread dated, the dental threads marked
sensitive, 0 errors. Kate, Warren, Blake, Mom, and the Vegas trip are one
thread each; no ambition thread is weight 3.

Three defects remained:

1. The model's `sensitive` flag missed a violence thread (neighborhood thugs),
   three threads about the law, and a health quote. Fixed with a code backstop:
   `SENSITIVE_WORDS` in `lib/threadExtract.ts`, whole word, any case, applied to
   every new thread's quote and label and to every mention of a non-person
   thread. It over-marks on purpose. `20260924c_record_threads_sensitive.sql`
   applies the same list once to existing rows; a test fails if the two lists
   drift.
2. A mention can no longer raise a PERSON thread to sensitive. One mention of
   Cindy being sick must not wall off every question that names her. Slice 3's
   writer checks each cited deposit's own text with the same list.
3. "my wife" (7 mentions) and "Cindy" (1) were two threads. Merged once in the
   same migration under the label "Cindy", keeping the "my wife" quote. An
   owner-facing merge belongs on the "What Basalith is asking from" page.

Also noted for the planner: an incident interview writes one deposit per turn,
so a thread from one September 15 interview shows 8 mentions. Rank threads by
distinct days, not by deposit count.

The t2 migration's clear of the Dr Ha rows is commented out after it ran, so a
re-paste cannot wipe this read.

Verified in Cowork: tsc clean; 63 tests pass across the two files; the new
migration on throwaway Postgres 16 against rows copied from the real report
merges the two rows (deposit ids deduped, dates widened, not sensitive), flags
the thugs, both law threads, and the hospital line, leaves "trusting people
without legal protection" alone, and on re-paste merges nothing and changes
nothing.

### Run order

1. Paste `20260924c_record_threads_sensitive.sql`, run its two PROVE IT queries,
   paste the output.
2. tsc prints nothing; `npm test` is green.
3. Commit, fast-forward main, push.
4. `THREAD_EXTRACTION=on` in Vercel production, then redeploy.

