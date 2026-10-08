# KEY PERSON DEPENDENCY REPORT. SLICE 3A (RULES AND THE TWO READINGS).

October 8, 2026. Six new files on disk, uncommitted. No existing file was
edited. Nothing registers the new Inngest function and nothing sends its
event, so this slice is inert in production until slice 3b.

Decided by David today: 14 days to release a finished report; a founder who
already owns a Basalith is refused at intake and David is told; assessment
founders skip the Founding Sequence and go straight to the eight area calls.

## Files (all new)

- `lib/assessment.ts`. Pure rules: the `assessment` status, which areas are
  captured, which is next, when the readings are due, the 14 day release
  window, the 90 day purge date.
- `lib/dependencyReadings.ts`. The job body, with every database, model, and
  Inngest call injected: check the record, run coverage twice, build the
  report, store the snapshot.
- `lib/inngest/dependencyFunctions.ts`. Wiring for the event
  `dependency.readings.requested`. NOT registered in `app/api/inngest/route.ts`.
- Tests for each: `lib/assessment.test.ts`, `lib/dependencyReadings.test.ts`,
  `lib/inngest/dependencyFunctions.test.ts`.

## What it guarantees

1. **Two readings are two runs.** Each call to `runCoverage` gets its own step
   ids (`a:open-run`, `b:open-run`). A test shows the hazard first: with one
   shared step function the second run returns the first run's id and makes
   zero probe calls. A second guard refuses outright if the two run ids are
   equal, and a source test pins that `runCoverage` reaches Inngest only
   through the three step ids the prefix covers.
2. **Nothing is spent on a record that is not whole.** Eleven cases (no row,
   no record, wrong status, wrong tier, seven areas, no intake, seven answers,
   already ready, already released, only ordered, record deleted) each start
   zero runs.
3. **A report is stored once.** The write is conditional on
   `status = 'capturing'`. A replay re-executes no step.
4. **A refusal stores nothing** and tells David by internal notice: a refused
   run, an incomplete run, an off label run.

## A captured area

A business area call that is `complete` AND wrote at least one deposit. A call
that closed with nothing accepted does not count. This is stricter than "the
call closed" and was my call; say if you want it loosened.

## Tested

In the sandbox against copies of the repo's own `coverage.ts`,
`coverageRun.ts`, `coverageProbes.ts`, and the rest of that import chain:
4 files, 44 tests passed (17 from slice 1, 27 new), and `tsc --noEmit` clean
over the new files with inngest 4 installed. That is not the repo.

## Run

    npx tsc --noEmit
    npx vitest run lib/assessment.test.ts lib/dependencyReadings.test.ts lib/inngest/dependencyFunctions.test.ts

Expected: tsc prints nothing; 3 files, 27 tests pass.

## Rollback

Delete the six files and this doc. Nothing references them.

## Slice 3b, which edits live files and goes through a preview

1. `app/api/assessment/start`: from an `ordered` row, create the founder's
   record (tier succession, status assessment), or refuse and notify David when
   the founder already owns a Basalith.
2. `/api/archive/b2b-question/answer`: for an assessment record, do not send
   `coverage.run.requested` when an area call closes. Today eight calls would
   fire eight runs before the report's two.
3. Intake route and the founder's assessment page.
4. Send `dependency.readings.requested` when the eighth area and the intake
   are both in. Register the function.
5. **B2 backup.** CLAUDE.md says trial ids are excluded from both backup
   functions because a B2 object sits under a 90 day lock. Assessment ids are
   not excluded. A founder's voice turns would enter B2, and the purge runner
   stops at `assert_no_b2`. `lib/inngest/storageBackupFunctions.ts` has not
   been read yet. This must be settled before the first real assessment.
6. CLAUDE.md section 4: `assessment` joins the status convention.
