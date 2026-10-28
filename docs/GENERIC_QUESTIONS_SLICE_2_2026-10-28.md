# GENERIC QUESTIONS, SLICE 2. OPENERS THAT KNOW THE OWNER.

October 28, 2026. Written to disk in basalith-official, uncommitted, on top of
slice 1 (docs/GENERIC_QUESTIONS_SLICE_1_2026-10-28.md), which is also
uncommitted. Commit them together or slice 1 first; slice 2 edits the same
answer route. Skeleton: claude/BASALITH_GENERIC_QUESTIONS_PLATFORM_2026-10-28.md,
slice 3 there.

Decided by David today: the owner describes his business on a portal screen,
not on the scoping call.

**With OWNER_OPENERS unset, nothing anyone sees changes.** The screen does not
appear, no opener is written, and every page redirects exactly as before.

## What it does

1. **A screen, `/archive/business`.** Two questions, in the owner's words:
   "What does the business do, and who pays for it?" and "Name three
   decisions that come back every year or every season." (the second is the
   Sept 24 wording). Saved as two deposits, found later by their question
   text, the way the round of six finds its answers. No table, no column, no
   migration. Training pairs carry probe type `PROFILE`.

2. **Who sees it.** A succession record or an assessment record, in English,
   with `OWNER_OPENERS=on` AND the record named in `CONVERSATIONAL_INTERVIEW`
   (or `all`). The dashboard, the assessment page, and the founding page send
   such an owner to the screen until both answers exist. A personal record,
   a trial, and a church record never qualify. A failed read never redirects:
   it cannot lock an owner out of his own portal. `?edit=1` lets an owner who
   has answered write again; the newest answer is the one used.

3. **The opener.** When such an owner opens an area call (the coverage map, or
   an assessment area), `lib/ownerOpener.ts` writes the opener from his two
   answers toward that area's aim. Sonnet writes, then the same deterministic
   guard as the follow ups (as a SEED), then a Haiku judge written for
   openers. One rewrite with the reasons. A second failure, a model error, or
   a draft past 15 seconds serves the authored opener from lib/areaSeeds.ts.

   - The area is still chosen by the code. Only the sentence changes.
   - The aims are the authored openers' targets, written as targets. The
     authored openers are never shown to the model (G7: it copies exemplars).
     A test pins that.
   - **Acquisition keeps its rule.** An assessment opener is neutral on
     dependency: the aims ask who did what, the writer is told never to
     presume the owner decides, and the judge has a fifth failure for it.
   - A term for a product, customer, role, or season appears only if the
     owner used it. A name, only if he wrote it. A quote, only if verbatim.

4. **Provenance.** The deposit that answers a written opener carries
   `question_source = 'interviewer'`, armed call or not, and so does its
   training pair. The source is cleared on the next unarmed turn so it never
   carries onto a spine question. The opener's log (aim, every attempt and
   why it failed, timing) rides `incident_sessions.state.opener`. Never shown,
   never deposited.

## The guard change

`checkDraft` takes probe type `SEED` for an opener. Only two rules differ for
it: an opener may be "Tell me about ..." ending in a period (or one question
ending in a question mark), and it may use "or" to name the kind of moment
("a hire or a firing"). The opener judge fails one that offers candidate
answers. Every follow up keeps the old rules; a test pins that.

## Files

New:
- `lib/businessProfile.ts`, `lib/businessProfileStore.ts`
- `lib/ownerOpener.ts`
- `app/archive/business/page.tsx`, `app/archive/business/BusinessClient.tsx`
- `app/api/archive/business-profile/route.ts`
- `lib/businessProfile.test.ts`, `lib/ownerOpener.test.ts`
- `docs/GENERIC_QUESTIONS_SLICE_2_2026-10-28.md` (this file)

Changed:
- `lib/interviewGuard.ts`: `SEED` probe type, shape and "or" rules for it
- `lib/interviewGuard.test.ts`: one case
- `lib/areaCalls.ts`: `startAreaCall` takes an optional opener writer, called
  only after the open call check
- `lib/incidentSession.ts`: one optional state field, `opener`
- `app/api/archive/area-call/start/route.ts`: builds the writer when it applies
- `app/api/archive/b2b-question/answer/route.ts`: `sourced` for provenance,
  source cleared on unarmed turns and at completion
- `app/archive/dashboard/page.tsx`, `app/archive/assessment/page.tsx`,
  `app/archive/founding/page.tsx`: the redirect, and the columns it reads

Not touched: the interviewer prompt, the reducer, renderProbe, the entity
prompt, the verifier, the authored openers, the founding openers.

## Gate, David's to run

    npx tsc --noEmit
    npx vitest run lib/ownerOpener.test.ts lib/businessProfile.test.ts lib/interviewGuard.test.ts lib/conversationalInterview.test.ts lib/weeklyPrompts.test.ts
    npm test

Expect: tsc shows only the five known lib/frozenLayer.test.ts errors; the
second line, 5 files, all passed. Then commit on a branch and deploy. Without
OWNER_OPENERS nothing changes.

## Turning it on

After slice 1's steps 1 to 3 (question side probe passed, the rule on, your
own records named and two area calls read):

1. `OWNER_OPENERS=on` in Vercel production. Redeploy.
2. Sign in to the MOAFly Technologies record (a succession record). The
   dashboard should send you to /archive/business. Answer both.
3. Open an area call from the coverage map. Read the opener. Then read its
   log:

        select id, state->'opener' as opener, state->>'pendingQuestion' as asked
        from incident_sessions
        where archive_id = '<id>' and state ? 'opener'
        order by created_at desc limit 5;

4. Answer it, then confirm the deposit says who wrote the question:

        select prompt, question_source from owner_deposits
        where archive_id = '<id>' order by created_at desc limit 3;

5. For an assessment: run a self order on an address you own, add its record
   id to `CONVERSATIONAL_INTERVIEW`, and read two openers. The acquisition
   openers are where a presumption would cost the most.

To stop: unset `OWNER_OPENERS`. Area calls go back to the authored openers,
and the screen disappears. Answers already given stay on the record.

## Known limits, by name

1. **The daily email and `/api/archive/b2b-question/next` keep the authored
   opener.** The email shows an opener without opening a call, and the portal
   opens the call later; two separately written openers would not match. The
   fix is the email opening the call itself, which changes a decision made on
   purpose (the cron creates no state). Not done.
2. **Founding openers stay authored.** Three broad openers, before the
   profile has anything to fit. Revisit after reading founding transcripts.
3. **Latency at call start.** One Sonnet and one Haiku call before the first
   question appears. NOT MEASURED. The log records it.
4. **The screen is required** for a qualifying owner. No skip. With the flags
   off it never appears.
5. **A founding link with `?area=`** for a succession owner without a profile
   goes to the screen, then the dashboard, not back to that area.
6. **English only**, like the follow ups.

## What was and was not checked

Checked in a copy of the repo outside it: 146 tests across the new and
nearby files; 140 passed, and the 6 that failed read files the copy did not
have (foundingProof.ts, the two entity chat routes, the trial start route,
the assessment begin page, one migration file). tsc on every changed and new
file: clean except the one deposit insert error in the answer route that is
there before these changes too in the copy, from its supabase-js version,
and missing imports in files the copy lacked.

NOT CHECKED: the full suite in the repo, `next build`, the screen in a
browser or on a phone, any live opener.

## Review fixes, October 28, 2026 (afternoon)

An independent review of slices 1 and 2 found no blocker for committing with
the flags unset, and five problems to fix before OWNER_OPENERS goes on. Fixed:

1. **Lockout.** `startAreaCall` wrote the opener after creating the call row,
   so a function killed during the model calls left an open call with no
   question and every later start refused. The opener is now written first;
   the open check runs again after the wait; the row is created and saved
   back to back. `area-call/start` sets `maxDuration = 45`.
2. **The time budget was not real.** One hard deadline now covers the whole
   opener, `OPENER_DEADLINE_MS = 20_000`, raced around every model call. The
   opener client makes no automatic retries (`maxRetries: 0`). A second
   attempt starts only with 9 seconds or more left. Tested with a model that
   never answers and with a clock already past the deadline.
3. **Acquisition neutrality, the code half.** On an assessment the writer uses
   the owner's description for its words only, never its facts about who
   does what, and never quotes it; a quoted assessment draft is thrown away
   in code (`quote_in_assessment`) before the judge sees it. The judge's rule
   E also fails an opener that repeats such a claim. The hint wording on the
   screen is the copy half and waits on David.
4. **The aims paraphrased the authored openers** (runs of nine to twelve
   shared words). Rewritten as abstract targets. The test now fails on any
   run of six words shared between any writer or judge prompt and any
   authored opener, area or founding, every lens, and proves it catches the
   reviewer's twelve word run. The judge prompt's two example moments are gone.

Also: the profile textareas cap at 3000 characters, the same as the route, so
nothing is cut silently; the dashboard sends only the owner to the profile
screen, never a successor.

Not changed, by name: the guard still leaves "or" and presumption in an
opener to the judge, which fails closed; `?edit=1` is linked from nowhere; a
double submit from two tabs writes the answers twice; no tests yet for the
answer route's provenance, the writer path in `startAreaCall`, or the new
route's 401/403/404.

Checked in the copy outside the repo: 121 tests across the nearby files, 119
passed, the 2 failures read files the copy did not have. tsc clean on every
changed file except the deposit insert line that fails the same way before
these changes.
