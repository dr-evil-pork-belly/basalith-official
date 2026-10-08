# KEY PERSON DEPENDENCY REPORT. SLICE 4A (NAV AND THE FOUNDER'S REPORT PAGE).

October 8, 2026. Written to disk, uncommitted. Follows the live test of
slices 1 to 3b (claude/BASALITH_DEPENDENCY_REPORT_LIVE_TEST_2026-10-08.md),
which found the Succession sidebar showing to an assessed founder.

## What changed

1. **Nav.** An assessment record sees one nav item, "Your assessment," under
   the label "Assessment." Nothing else from a client's portal is listed.
2. **Report page.** `/archive/assessment/report`: the founder reads the stored
   report. Read only. Linked from the assessment page once the report is built.

Release, the buyer's view, the lapse, the purge, and payment are still not
built, and nothing on these pages offers or promises them.

## Files

New:
- `app/api/archive/assessment/report/route.ts`: GET only. Owner, assessment
  record, report built. Returns the snapshot as stored.
- `app/archive/assessment/report/page.tsx`, `ReportClient.tsx`
- `app/archive/assessment/report/ReportView.tsx`: presentational. The buyer's
  view will reuse it, so the two cannot show different reports.

Edited, LIVE:
- `app/archive/layout.tsx`: reads `status`, passes `assessment`. 9 lines.
- `app/archive/ArchiveLayoutClient.tsx`: `ASSESSMENT_NAV`, three ternaries,
  the group label. 19 lines. Every other record gets the nav it had.

Edited, from this feature:
- `lib/assessment.ts`: `founderCanReadReport`. Test file: 1 more test.
- `lib/assessmentGates.test.ts`: 4 more guards (nav, report route, the view
  computes nothing, no release offered).
- `app/archive/assessment/AssessmentClient.tsx`: "Read your report" link.

## The report page

Four panels, all drawn from the snapshot:
1. The finding: the headline sentences, counts with denominators.
2. Where the founder is in the decision: founder domains then shared ones,
   thinnest record first.
3. By domain: all eight, dependency label, and both readings as rows of marks
   (one mark per question, filled when answered from a deposit).
4. What this report is, and is not: the limits.

No score, no percent, no state word. A guard test fails if any appears.

Checked by rendering a fixture report in a headless browser at desktop and
phone widths. Fonts fell back there; the layout held. NOT seen in the real
portal, and no real report exists yet to render: nobody has run the two
readings.

## Known gaps

- **The nav is not access control.** A founder who types `/archive/entity` or
  `/archive/voice` still reaches it. Contributors and uploads refuse a record
  that is not active; the others do not.
- **Nothing real to look at.** The page can only be seen with a report in the
  table. The cheapest way to see it live is to paste a fixture snapshot into
  the test row by SQL; the honest way is to finish eight calls.
- No print stylesheet yet.

## Tested in the sandbox

73 tests in 6 files passed (`assessment` 16, `assessmentGates` 13,
`dependencyReadings` 10, `dependencyReport` 17, `dependencyFunctions` 7,
`start/route` 10). `tsc` showed no error in a new or edited file. Not the
full repo.

## Run

    npx tsc --noEmit
    npx vitest run

Expected: tsc prints nothing; 50 files, 857 tests passed, 2 skipped (852
before, plus 5).

## Rollback

`git checkout -- app/archive/layout.tsx app/archive/ArchiveLayoutClient.tsx`
and delete the new files. No migration.
