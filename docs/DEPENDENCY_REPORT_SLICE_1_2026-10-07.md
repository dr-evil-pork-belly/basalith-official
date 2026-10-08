# KEY PERSON DEPENDENCY REPORT. SLICE 1 (PURE CORE).

October 7, 2026. Written to disk, uncommitted. No schema, no route, no page,
no model call. Nothing in the app imports these files yet, so nothing a
customer sees changes.

Decided by David the same day: fixed fee $5,000; founder only; fully
generated; minimum record is one area call per business domain (eight); the
founder sees the report first and releases it, and a buyer is told when a
finished report was not released; no overall score.

## Files (all new)

- `lib/dependencyIntake.ts`. Eight questions, one per B2B domain, asking who
  makes that kind of decision today. Three answers: founder, shared,
  delegated. Optional role for the other person. `validateIntake` is all or
  nothing.
- `lib/dependencyReport.ts`. `buildDependencyReport` takes the intake, the
  list of domains with a closed area call, and the probe results of two
  coverage runs. Returns report data or a named refusal.
- `lib/dependencyReport.test.ts`. 17 tests.

No existing file was edited.

## What the report says, and what it will not

- Two readings per domain, never blended: dependency (founder stated) and
  capture (questions answered from a deposit, per run).
- Counts lead. The state word is never read: `backed` is unreachable today,
  so nearly every domain with a deposit reads `partial`.
- One category only, with no threshold: a domain is silent when no question
  got a grounded answer on either reading.
- Headline is counts with real denominators, for example: "5 of 8 domains run
  through the founder, as the founder states it. Across those 5, 7 of 30
  questions got a grounded answer from the record on one reading and 9 of 30
  on the other."
- Both runs are printed where they differ. Neither is picked.
- No hysteresis, no overreach, no overall score.

## Changed from the skeleton

1. The skeleton's four way split (on the record or not) needed a threshold
   the codebase says is not calibrated. Replaced with counts plus "silent."
2. The skeleton's "evidence: the founder's own deposit, verbatim" section is
   NOT built and cannot be yet. Nothing in the pipeline identifies which
   deposit an answer rests on (reliance probe recon R1). Open for slice 4.
3. Stability is shown as two counts, not as an "unstable" state flag.

## Refusals

`intake_incomplete`, `record_incomplete`, `run_mismatch` (same run twice, or
not under the live probe set), `run_incomplete` (a probe missing, unknown, or
repeated, or a domain under `MIN_USABLE_PROBES` usable verdicts).

`MIN_USABLE_PROBES = 4` is set by judgment and is not calibrated. Reversible.

## Run

    npx tsc --noEmit
    npx vitest run lib/dependencyReport.test.ts

Expected: tsc shows only the five known `lib/frozenLayer.test.ts` errors; 17
tests pass. In the sandbox the 17 passed and the three new files type checked
clean against copies of `coverage.ts`, `coverageProbes.ts`, `b2bDomains.ts`,
and `verifyGrounding.ts`. That is not the repo: paste the real output.

## Rollback

Delete the three files and this doc. Nothing references them.

## Next (slice 2)

Migration `dependency_reports` on the `referral_credits` pattern, pasted by
hand. Needs two answers first: the retention rule for an assessment row (the
trial deletion job will not touch it), and who the recipient is at order time.
