# CONVERSATIONAL INTERVIEW. SLICE 1.

October 22, 2026. Written to disk in basalith-official, uncommitted. Follows
the skeleton claude/BASALITH_CONVERSATIONAL_INTERVIEW_2026-10-22.md, which
David approved the same day with every open call taken as recommended.

**With no environment variable set, this slice changes nothing anyone sees
or anything any record stores.** Every new path is behind a flag, and the
two prompt edits are byte identical when their flag is off. Safe to deploy
before the migration and before any flag.

## What it does

On an area call, on a record named in `CONVERSATIONAL_INTERVIEW`, in English:

1. The reducer picks the next probe type, exactly as before.
2. `renderProbe` renders the spine sentence, exactly as before.
3. If the call is on the interviewer arm, Sonnet writes the question from what
   the person just said (`lib/interviewer.ts`).
4. The guard checks it (`lib/interviewGuard.ts`): fifteen deterministic rules,
   then one Haiku judgment on presupposition and steering. A failure gets one
   rewrite with the reasons. A second failure, a model error, or a turn past
   15 seconds serves the spine sentence.
5. The person sees the question. Whoever wrote it is stored on the call
   (`pendingQuestionSource`) and then on the deposit (`question_source`).

Every turn on an armed call, both arms, is logged on the call's state
(`interviewLog`): probe type, arm, source, the classifier time, the
interviewer time, each attempt, every rejected draft and why.

## The A/B, built in

The arm is stamped on a call at its first follow up and never changes. A
named record alternates, one area call per arm. The starting arm comes from
the last hex digit of the record id, so across people half start on each.
`CONVERSATIONAL_INTERVIEW_ARM` set to `interviewer` or `spine` forces every
new call on a named record to that arm.

Founding calls, the owner demo, every unnamed record, and any language other
than English: unchanged.

## The record rule, enforced

- **Provenance.** On an armed call the deposit carries `question_source`
  (`interviewer` or `spine`), and the training pair carries
  `metadata.question_source`. Null means not recorded (everything before today
  and every unarmed call).
- **Assent is not evidence.** On an armed call, a turn of eight words or
  fewer made only of agreement ("yeah, exactly", "that's right") is still
  deposited, but its pair is written `included_in_training = false` with
  `metadata.assent_only = 'true'` (`lib/assent.ts`). Deterministic; no model
  decides what counts as agreement. Turns under 20 characters never got a
  pair anyway.
- **The question side rule** (R3). Behind `QUESTION_SIDE_RULE=on`, one
  paragraph is added to the verifier and to the entity prompt: only the A line
  of a pair is the person's words; a position only in a Q line, or only agreed
  to, is not supported (`lib/questionSideRule.ts`). Off, both prompts are byte
  for byte what they were. This is the prompt edit that needs the same day A/B.

## Files

New:
- `lib/interviewer.ts`: the constitution, the per probe aims, the Sonnet call
- `lib/interviewGuard.ts`: `checkDraft` and `judgeDraft`
- `lib/conversationalInterview.ts`: who qualifies, the arm, one turn, the log
- `lib/conversationalInterviewStore.ts`: counts a record's armed calls
- `lib/assent.ts`
- `lib/questionSideRule.ts`
- `lib/interviewGuard.test.ts`, `lib/conversationalInterview.test.ts`,
  `lib/questionSideRule.test.ts` (31 tests)
- `supabase/migrations/20261022_owner_deposits_question_source.sql`
- `docs/CONVERSATIONAL_INTERVIEW_SLICE_1_2026-10-22.md` (this file)

Changed:
- `app/api/archive/b2b-question/answer/route.ts`: model timing, provenance on
  the deposit (with a retry without the column), assent tag, the interviewer
  turn after `renderProbe`
- `lib/incidentSession.ts`: three optional state fields, no reducer change
- `lib/trainingPipeline.ts`: optional `provenance` argument; `includeInTraining`
  untouched (lib/assessmentGates.test.ts pins its signature)
- `lib/verifyGrounding.ts`: `auditorSystem()` replaces the constant at the call
- `lib/entitySystemPrompt.ts`: one empty string slot above the settled pairs

Not touched: the reducer's transitions, `renderProbe`, the classifier, the
frozen layer retriever, the founding sequence, the demo, the round of six.

## Gate, David's to run

    npx tsc --noEmit
    npx vitest run lib/interviewGuard.test.ts lib/conversationalInterview.test.ts lib/questionSideRule.test.ts
    npm test

Expect: tsc shows only the five known lib/frozenLayer.test.ts errors. The
second line: 3 files, 31 tests passed. Then commit on a branch and deploy.
With no flags set, nothing changes in production.

Then paste `supabase/migrations/20261022_owner_deposits_question_source.sql`
and run its two confirm queries.

## Turning it on, in order

1. **The question side rule, same day A/B.** In PowerShell, with the flag off
   and then on:

        npx tsx scripts/two-layer-probe.ts
        npx tsx scripts/demo-refusal-probe.ts
        npx tsx scripts/gap-log-probe.ts
        $env:QUESTION_SIDE_RULE = 'on'
        npx tsx scripts/two-layer-probe.ts
        npx tsx scripts/demo-refusal-probe.ts
        npx tsx scripts/gap-log-probe.ts
        Remove-Item Env:QUESTION_SIDE_RULE

   Same results both ways (demo refusal 10/10) means the rule costs nothing
   on today's records. Then set `QUESTION_SIDE_RULE=on` in Vercel production.
   Keep it OFF in any environment that runs the G7 Stage 2 arms, or log the
   deviation: it changes the entity prompt.

2. **Your own records first.** Set `CONVERSATIONAL_INTERVIEW` in Vercel
   production to a comma separated list of full archive ids (your Dr Ha
   record, the MOAFly Technologies record). Redeploy for the variable to take.
   Open an area call. Look at the log after each call (query below).

3. **Then the outside founders**, added to the same list, only once step 1 is
   on.

To stop: remove the variable. A call already on the interviewer arm finishes
on the spine.

## Reading the A/B

    -- One row per armed call.
    select id, created_at, status,
           state->'areaCall'->>'area'        as area,
           state->>'interviewArm'            as arm,
           jsonb_array_length(coalesce(state->'interviewLog', '[]'::jsonb)) as turns
    from incident_sessions
    where archive_id = '<id>' and state ? 'interviewArm'
    order by created_at;

    -- Every turn: who wrote it, how long it took, what the guard threw away.
    select s.id, e->>'probeType' as probe, e->>'arm' as arm, e->>'source' as source,
           (e->>'msModel')::int as ms_model, (e->>'msTotal')::int as ms_interviewer,
           e->'attempts' as attempts
    from incident_sessions s, jsonb_array_elements(s.state->'interviewLog') e
    where s.archive_id = '<id>'
    order by s.created_at, e->>'at';

    -- Deposits by who wrote the question.
    select question_source, count(*) from owner_deposits
    where archive_id = '<id>' and question_source is not null
    group by 1;

## What was and was not checked

Checked in a copy of the repo outside it, with the repo's own packages
installed: `tsc` on the answer route and every file it imports, clean; the
three new test files (31 tests) and nine existing ones that touch these files
(renderProbe, entitySystemPrompt, trainingPipeline, incidentSession,
incidentClassifier, foundingSequence, areaCalls, assessmentRound,
coverageProbesPersonal), 96 tests, all passing; the
`includeInTraining` signature pinned by assessmentGates.test.ts still
matches; lib/questionLens.test.ts's checks on the files changed here pass
(its other cases need files the copy did not have).

NOT CHECKED: the full suite in the repo; `next build`; a single live call
with the real interviewer, because there is no API key outside your machine;
the latency of a turn (the log measures it on the first real call); how often
the guard throws drafts away (same).

## Known limits, by name

1. **Latency.** Each interviewer turn adds a Sonnet call and a Haiku call on
   top of the classifier. NOT MEASURED. The page shows its usual wait.
2. **The guard can be too strict.** A capitalized word it does not know reads
   as a name and sends the turn to the spine. That costs a better question,
   never a worse one. The log shows how often.
3. **English only** in this slice. Other languages keep the spine.
4. **No outside founder sees it** until you add their record id.
5. **Founding calls stay on the spine.** Slice 3 is B2C founding calls.
