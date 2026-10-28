# GENERIC QUESTIONS, SLICE 1. TURN ON WHAT IS BUILT.

October 28, 2026. Written to disk in basalith-official, uncommitted. Follows
the recon and skeleton claude/BASALITH_GENERIC_QUESTIONS_PLATFORM_2026-10-28.md.

Decided by David today:

1. The question side probe has not been run, and CONVERSATIONAL_INTERVIEW is
   not set in production. Nobody gets the interviewer yet.
2. Yes to a CONVERSATIONAL_INTERVIEW value that arms every record.
3. Build both next slices, ship the founding calls first, then the openers.
4. The Monday weekly prompt stops for owners on a succession record. Personal
   records keep it until the bank is rewritten.

**With no new environment variable set, the only change anyone sees is that
succession owners stop getting the Monday weekly prompt.** Everything else
is behind a flag.

## What changed

1. **`CONVERSATIONAL_INTERVIEW=all`** arms every English record without listing
   ids. `on`, `true`, and anything else that is not a list of ids or `all`
   stays off, so a typo cannot switch everyone on. The within person A/B
   still runs: each record alternates arms, one call each.
   `CONVERSATIONAL_INTERVIEW_ARM=interviewer` ends the A/B and puts every new
   call on the interviewer. (`lib/conversationalInterview.ts`, `enabledFor`.)

2. **Founding calls can take the interviewer**, behind their own flag:
   `CONVERSATIONAL_INTERVIEW_FOUNDING=on`. A founding call qualifies only when
   the record is also named (or `all`) and the language is English. Without
   the founding flag, founding calls stay on the spine exactly as before, so
   area calls can be proven first. (`callQualifies` takes `isFoundingCall`;
   the answer route passes `!!next.state.founding`.)

   Same engine, same guard, same fallback, same log, same provenance on the
   deposit. The interviewer already knows the personal, succession, and
   church lenses. NOT DONE: the softer B2C register from the Oct 22 table.
   The constitution is the same for every call; only the "who" line changes
   by lens. Read founding call transcripts before deciding it needs one.

   With both flags on, a founding call joins the same alternation as area
   calls, so on a new trial record call 1 has an even chance of either arm.

3. **The Monday weekly prompt skips succession records.**
   `weeklyPromptGoesTo` in `lib/weeklyPrompts.ts`; the cron now selects
   `tier` and returns `skippedSuccession` in its response. Contributor
   question refresh in the same cron is unchanged. Assessment and trial
   records were never sent it (the cron reads status active only).

## Files

Changed:
- `lib/conversationalInterview.ts`: `all`, `foundingOn`, `isFoundingCall`
- `lib/conversationalInterview.test.ts`: two new cases
- `app/api/archive/b2b-question/answer/route.ts`: one `callKind` passed to
  both `callQualifies` calls, comment updated
- `lib/weeklyPrompts.ts`: `weeklyPromptGoesTo`
- `app/api/cron/weekly-prompt/route.ts`: selects tier, skips, counts

New:
- `lib/weeklyPrompts.test.ts` (3 tests, one reads the cron source)
- `docs/GENERIC_QUESTIONS_SLICE_1_2026-10-28.md` (this file)

Not touched: the interviewer prompt, the guard, the reducer, renderProbe,
the entity prompt, the verifier. No migration.

## Gate, David's to run

    npx tsc --noEmit
    npx vitest run lib/conversationalInterview.test.ts lib/weeklyPrompts.test.ts
    npm test

Expect: tsc shows only the five known lib/frozenLayer.test.ts errors. The
second line: 2 files, all passed. Then commit on a branch and deploy. With no
new flags set, the only live change is the Monday skip.

## Turning it on, in order

Each step gates the next.

1. **The question side probe.** In PowerShell:

        $env:QUESTION_SIDE_RULE = 'on'
        npx tsx scripts/question-side-probe.ts
        Remove-Item Env:QUESTION_SIDE_RULE

   Pass: LEAD and MOTIVE blocked (verifier unsupported 9/10 or better, shipped
   position 1/10 or fewer); STATED kept (verifier deposit 9/10 or better,
   shipped position 8/10 or better). Paste the output back.

2. **`QUESTION_SIDE_RULE=on`** in Vercel production.

3. **Your own records, area calls.** `CONVERSATIONAL_INTERVIEW` = the Dr Ha
   record id and the MOAFly Technologies record id, comma separated.
   Redeploy. Two area calls on each (one lands on each arm). Read the log
   (queries in docs/CONVERSATIONAL_INTERVIEW_SLICE_1_2026-10-22.md).

4. **Founding calls.** Add `CONVERSATIONAL_INTERVIEW_FOUNDING=on`. Start a
   throwaway trial on an address you own, add its record id to the list,
   redeploy, and run call 1.

5. **Everyone.** Replace the list with `all`. Keep the A/B until you have read
   enough transcripts to call it; then `CONVERSATIONAL_INTERVIEW_ARM=interviewer`.

To stop at any point: remove the variable and redeploy. A call already armed
finishes on the spine.

## What was and was not checked

Checked in a copy of the repo outside it: the two changed test files plus
interviewGuard, questionSideRule, renderProbe, foundingSequence, areaCalls,
assessmentRound, and questionPlanner, 114 tests passed. questionLens.test.ts
has 6 cases that read files the copy did not have; those 6 failed for that
reason only. tsc on the changed files: clean except one error on the
deposit insert in the answer route (line 205), which is present before this
change too in the copy, and comes from the supabase-js version installed
there, not the repo's.

NOT CHECKED: the full suite in the repo, `next build`, any live call.
