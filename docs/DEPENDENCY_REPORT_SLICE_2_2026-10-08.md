# KEY PERSON DEPENDENCY REPORT. SLICE 2 (TABLE).

October 8, 2026. One new file on disk, uncommitted, NOT yet pasted:
`supabase/migrations/20261008_dependency_reports.sql`. No code reads or
writes the table yet. No existing table is touched.

Decided by David today: an assessment record lives 90 days after its report
closes; the recipient is the one buyer named at order time.

## Row semantics (irreversible class, read before pasting)

One row is one ordered assessment: one named buyer, one founder, one report.

| status | meaning |
|---|---|
| ordered | paid, founder invited |
| capturing | founder started |
| ready | report built, founder deciding |
| released | founder released it to the buyer |
| not_released | report was built and the founder did not release it |
| not_completed | the founder never finished |

The last three are closed and carry `closed_at`.

- `report` is a snapshot of `buildDependencyReport` output at build time. Pages
  render the snapshot and never recompute, so what was released is what is read.
- `purge_after` is `closed_at` plus 90 days. The purge deletes the founder's
  record (the `archives` row and everything under it) and clears `intake` and
  `report` on this row. The row stays: who ordered, what was paid, how it ended.
- `converted_at` clears `purge_after`. A founder who becomes a paying client
  keeps the record.
- Both run ids and `archive_id` fall to null on their own when the record is
  deleted (ON DELETE SET NULL).

## Baked in, and David has not ruled on them

1. **The purge clears the buyer's copy too.** After 90 days the released
   report is gone from Basalith. The buyer keeps whatever they saved or printed.
   The alternative (keep the snapshot forever) holds founder data past the
   deletion promise.
2. **The row outlives the purge** with names, emails, fee, and outcome.
3. **One assessment per founder record.** A second buyer for the same founder
   is a new order and a new record.
4. **No payment reference column.** The Stripe path has not been read. It is
   added in slice 5, additively.
5. **No deadline column** for the founder's release decision. The number of
   days is not decided.

## Tested

Run twice on a throwaway Postgres 16 with stub `archives` and `coverage_runs`
tables and the three Supabase roles: second run is a no op; 24 columns; zero
grants to anon, authenticated, or PUBLIC; 15 constraints. Nine writes that
should fail did fail on the named constraint (uppercase email, released
without a time, ready without a report, report without intake, same run
twice, purge date on an open row, converted but still scheduled, purged with
the report kept, second assessment on one record). The full path ordered to
released to purged passed.

That is not Supabase. Paste the migration, then paste back the output of the
four confirm queries at the bottom of the file.

## Rollback

    drop table if exists dependency_reports;

Nothing references it.

## Still open from slice 1

The pasted output of `npx tsc --noEmit` and
`npx vitest run lib/dependencyReport.test.ts` has not come back.

## Next (slice 3)

The assessment sequence: `archives.status = 'assessment'` on a succession
tier row, eight area calls, the intake, two coverage runs on completion, the
snapshot written. Needs a read of /api/trial/start, the /answer route, and
lib/inngest/coverageFunctions.ts first.
