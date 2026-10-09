# KEY PERSON DEPENDENCY REPORT. SLICE 4B (THE ROUND OF SIX).

October 8, 2026. Written to disk, uncommitted. Follows
docs/DEPENDENCY_REPORT_QUESTION_ANALYSIS_2026-10-08.md, items A and B, which
David approved the same day ("word").

Slice 4a gate, cleared by David's paste: tsc printed nothing; the guard file
passed 13 of 13 after the line ending fix; full suite 857 passing.

## What changed for a founder

Each of the eight parts now has two steps:

1. The call, as before: one incident, ten or so follow ups.
2. **Six short questions**, typed, one at a time. Four on the decisions in that
   domain the incident did not reach. Two on who else can make them.

A part is "on the record" only when both are in. The two readings wait for all
eight complete and the intake. When a call closes, the button now reads "On to
the six questions" and goes to that part's round.

That is 48 more answers. With the calls, an assessment is roughly two hours of
a founder's time. NOT MEASURED: no founder has done one.

## The questions

`lib/assessmentRound.ts`, 48 in all, version `r1`. Example, Capital:

- When there is money left over, where does it go first? Tell me about the last time.
- Tell me about the last time you borrowed for the business, or chose not to. What decided it?
- How much cash do you keep on hand, and at what level do you start to worry?
- Is there a product or a line here that makes money and has stopped growing? What have you done with it?
- Who besides you can approve spending, and up to what amount?
- If you were away for three months, which money decisions would wait for you?

Rules they are held to, each by a test:

- No question repeats a coverage probe, an area opener, an intake question, or
  another round question.
- **No question shares a run of six words with any probe.** Aiming at the same
  judgment is the point; borrowing the probe's sentence would turn the reading
  into a recall test. This test caught seven of my first drafts, which were
  reworded.
- Copy rules: no em dash, no exclamation point, no hyphenated word.

## How an answer is stored

An owner deposit: prompt is the question text, response is the answer,
`source_type` `web_capture`, exactly like an interview turn. After the
response, classify, then the training pair with probe type `ROUND`.
`includeInTraining` takes a pair with a probe type on the interview's say so,
which is the same rule founding and area call turns already use. Under 20
characters is refused, because the pipeline writes no pair below that.

**No migration.** An answer is found by its question text: one read of
`owner_deposits` with `.in('prompt', the 48 questions)`.

The cost of that choice: **editing a question's wording reopens it** for any
assessment in progress. Do not edit wording while one is open; change the set
and bump `ROUND_VERSION`.

## What this does and does not fix

Does: the record now reaches every subject the report's questions cover, and
holds the founder's own words on who else can decide, per domain.

Does not:

- **The report does not print the dependency answers yet.** They are on the
  record and in no report. Printing each one verbatim under its question is
  honest (a quoted answer to a stated question, not an attribution) and is the
  obvious next change to the report.
- **The follow ups inside a call are unchanged.** Still the same fixed script
  in all eight calls. That is items C and D of the analysis, and it changes the
  interview every client uses.
- **Typed only.** The calls take voice; the round does not. The recorder lives
  inside the founding page and was not pulled out for this slice.
- **Asking is not grounding.** A vague answer changes no count. Whether real
  answers move the counts is exactly what the first real end to end run will
  show. It has still not been run.

A caution worth stating: with every subject asked, a founder who answers
everything in substance should read high in every domain. Then the counts stop
separating founders at the top, and the dependency half (who else can decide)
carries the report. That is where a buyer's real question lives anyway.

## Files

New: `lib/assessmentRound.ts`, `lib/assessmentRound.test.ts`,
`app/api/archive/assessment/round/route.ts`,
`app/archive/assessment/round/page.tsx`, `RoundClient.tsx`.

Edited, this feature: `lib/assessment.ts` (`completeAreasFrom`, areas carry
their round), `lib/assessmentStore.ts` (`loadRoundPrompts`; the readings
request reads the round), `lib/dependencyReadings.ts` and its wiring (the job's
check reads the round through the same two loaders the page uses),
`app/api/archive/assessment/route.ts`, `AssessmentClient.tsx`, three test files.

Edited, LIVE: `app/archive/founding/FoundingClient.tsx`, 1 line, inside the
`assessment` branch only. `CLAUDE.md`.

Three places decide whether a record is whole: the page, the event sender,
and the job. A guard test pins that all three read the round.

## Tested in the sandbox

88 tests in 7 files passed (`assessment` 18, `assessmentGates` 18,
`assessmentRound` 8, `dependencyReadings` 10, `dependencyReport` 17,
`dependencyFunctions` 7, `start/route` 10), run against the delivered files
with Windows line endings. `tsc` showed no error in a new or edited file. Not
the full repo. The round route has source guards and no behavioral test.

## Run

    npx tsc --noEmit
    npx vitest run

Expected: tsc prints nothing; 51 files, 872 tests passed, 2 skipped (857
before, plus 15).

## Live check, if deployed

On a test assessment: finish one call, expect "On to the six questions";
answer the six; expect that part to read "On the record" and the header
"1 of 8 on the record". Then:

    select prompt, length(response) as chars, created_at
    from owner_deposits
    where archive_id = '<record id>' and prompt in (
      'When there is money left over, where does it go first? Tell me about the last time.'
    );

    select metadata->>'probe_type' as probe_type, included_in_training, count(*)
    from training_pairs
    where archive_id = '<record id>'
    group by 1, 2 order by 1, 2;

Expected: the deposit is there; a `ROUND` row with `included_in_training`
true and a count equal to the round answers given.

## Rollback

`git checkout --` the edited files and delete the five new ones. No migration.
Round deposits already written stay on the record as ordinary deposits.
