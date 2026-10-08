# KEY PERSON DEPENDENCY REPORT. SLICE 3B (THE FOUNDER'S SEQUENCE).

October 8, 2026. Written to disk, uncommitted. This slice EDITS LIVE FILES.
Preview first; do not push to main untested.

Slice 3a gate, cleared by David's paste the same day: `tsc --noEmit` printed
nothing; 3 files, 27 tests passed on vitest 4.1.8.

## What a founder can now do

1. Open `/assessment/begin?order=<report id>` and type their own email. If the
   pair matches an `ordered` row, their record is created and the sign in link
   is sent.
2. Land on `/archive/assessment`: eight areas, each with a Begin link, and the
   eight intake questions.
3. Run each area call on the existing interview page.
4. When all eight areas and the intake are in, the two readings run and the
   report snapshot is stored. The page says "Your report is built" and stops.

NOT in this slice: reading or releasing the report, the buyer's view, the
14 day lapse, the 90 day purge, any email to the founder or buyer, the order
and payment. A row gets into `dependency_reports` by hand for now.

## New files

| File | What |
|---|---|
| `lib/assessmentStore.ts` | Reads, and `requestReadingsIfDue` (the one event send) |
| `lib/assessmentGates.test.ts` | Source guards on every place an assessment touches client code |
| `app/api/assessment/start/route.ts` | Public start: id plus email, one winner, refusals |
| `app/api/assessment/start/route.test.ts` | 10 behavioral tests against an in memory stand in |
| `app/api/archive/assessment/route.ts` | Owner GET (progress) and POST (intake, written once) |
| `app/assessment/begin/*` | The way in. Same shell as `/begin` |
| `app/archive/assessment/*` | The founder's page. Stone register, no new tokens |

## Edited, from slice 3a (still uncommitted)

- `lib/assessment.ts`: adds `assessmentProgress`. `lib/assessment.test.ts`: 3 more tests.
- `lib/inngest/dependencyFunctions.ts`: a 90 second `settle` step before the
  check, so the last answer's training pair has landed. Test file: 2 more tests.

## Edited, LIVE

| File | Change | Lines |
|---|---|---|
| `app/api/archive/b2b-question/answer/route.ts` | Reads `status`. For an assessment, an area call closing sends no `coverage.run.requested`; it calls `requestReadingsIfDue`. Every other record: unchanged branch | about 20 |
| `lib/inngest/storageBackupFunctions.ts` | Both trial loads become `.in('status', ['trial', 'assessment'])`. Step ids unchanged | 2 code lines |
| `app/api/inngest/route.ts` | Registers `dependencyReadings` | 2 |
| `app/archive/dashboard/page.tsx` | An assessment record is redirected to `/archive/assessment` | about 10 |
| `app/archive/founding/page.tsx` | Assessment with no area redirects; passes `assessment` | about 7 |
| `app/archive/founding/FoundingClient.tsx` | `assessment` prop swaps the two sentences that promise a map reading, and the way back | about 15 |
| `CLAUDE.md` | Section 4, "Dependency assessment" | 1 paragraph |

For every record that is not an assessment, each of these takes the branch it
took before. That is what the preview has to confirm.

## Decisions made in the build, for David to overrule

1. **The id alone starts nothing.** The founder must type the email the row
   holds. A wrong email and an unknown id get the same answer.
2. **The buyer's name is not shown before sign in.** It appears on
   `/archive/assessment` ("Requested by ...").
3. **Refused: an existing owner, a successor, or a guide.** Checked before any
   role is changed, so a successor's sign in is never rerouted by an attempt.
   A contributor is allowed and becomes an owner, as on `/begin`.
4. **The intake is written once.** A second save is answered 409.
5. **No copy promises release, deletion, or the buyer's copy.** None is built.
   The begin page says only that someone considering the business asked for a
   report. A test fails if the words appear.
6. **A founder can still open a ninth call** on an area already captured,
   including while the readings run. Harmless to the count; it does change the
   record between the two readings. Not blocked in this slice.

## Known gaps, by name

- **The nav.** An assessment founder sees the Succession sidebar (entity,
  contributors, succession). Contributors and uploads already refuse a record
  that is not `active`. Trimming the nav is slice 4.
- **`ready` is a dead end** for the founder until slice 4.
- **No retry button.** If a reading is refused, David gets an internal notice
  and resends `dependency.readings.requested` with `{ "reportId": "..." }` from
  the Inngest dashboard.
- **Cost of one assessment's readings:** two runs, 96 model calls each, up to
  144 each over the frozen layer cap.

## Tested in the sandbox

Against copies of the repo files: 73 tests in 7 files passed
(`assessment` 15, `assessmentGates` 9, `dependencyReadings` 10,
`dependencyReport` 17, `dependencyFunctions` 7, `start/route` 10, and the
untouched `trialFunctions` 5 to confirm the route registration pin still
holds). `tsc` showed no error in any new or edited file. The sandbox does not
have the whole repo, so the full suite and a full `tsc` have NOT been run.

## Run, in this order

    npx tsc --noEmit
    npx vitest run

Expected: tsc prints nothing. The full suite passes: it was 44 files and 784
tests before this feature, plus the files added since.

## Preview test (about fifteen minutes, costs no coverage run)

Standing lessons apply: a preview sits behind Deployment Protection, so use a
signed in browser; and a preview deploy repoints the production Inngest app
until the next production deploy.

1. Insert a test row. Use an email that owns no Basalith and is not a
   successor:

       insert into dependency_reports
         (buyer_name, buyer_email, buyer_org, founder_name, founder_email, amount_cents)
       values
         ('Test Buyer', 'buyer@example.com', 'Test Co', 'Test Founder', '<an email you can read>', 500000)
       returning id;

2. Open `/assessment/begin?order=<id>`. Wrong email: "We could not find that
   invitation." Right email: "Check your mail."
3. Sign in from the link. Expect `/archive/assessment`, "0 of 8 on the record,"
   "Requested by Test Buyer, Test Co."
4. Begin one area. Expect the heading "This part of the business, in your own
   words." Finish the call. Expect "Back to your assessment" and no sentence
   about a map.
5. Paste:

       select status, archive_id is not null as has_record, intake is not null as has_intake
       from dependency_reports where id = '<id>';

       select id, trigger_source, started_at
       from coverage_runs
       where archive_id = (select archive_id from dependency_reports where id = '<id>');

   Expected: `capturing`, true, false; and ZERO coverage_runs rows. That last
   line is the proof the area call fired no run.
6. Save the intake. Expect "Your answers are in." Save again from a second
   tab: nothing changes.
7. Sign in as yourself. Expect your own dashboard exactly as before, and one
   area call on your own Basalith still followed by a coverage run.

Clean up: `delete from archives where id = '<record id>';` then
`delete from dependency_reports where id = '<id>';` and remove the test auth
user in the Supabase dashboard.

## Rollback

Before commit: `git checkout -- <the seven edited live files>` and delete the
new files. After a deploy: `vercel rollback`. No migration in this slice.
