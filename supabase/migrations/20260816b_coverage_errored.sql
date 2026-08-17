-- ── Coverage map, discarded verdicts ──────────────────────────────────────────
-- Additive to 20260816_coverage_overreach.sql. Paste after it.
--
-- WHY. lib/verifyGrounding.ts fails safe: any parse or call error returns
-- basis='unsupported'. That is correct for production, where the rule is never
-- ship an unverified founder position. It is wrong as measurement. A JSON parse
-- failure would be recorded as the entity reaching past the archive, which
-- depresses coverage and inflates overreach on evidence that does not exist.
--
-- The first v2 fixture run hit one ("Unexpected non-whitespace character after
-- JSON at position 105") and it was silently counted as overreach.
--
-- Such a verdict is now discarded rather than counted in either dimension, and
-- the count is recorded here so a domain that read open on three real probes is
-- distinguishable from one that read open on three probes and three failures.
--
-- Detection is a signature match on verifyGrounding's catch-path return
-- (position 'unknown', topic 'this', basis 'unsupported'), because the verifier
-- exposes no error channel and this build does not change shared production
-- code. If probes_errored ever climbs, the fix is a real error channel on the
-- verifier, not a wider heuristic here.

alter table archive_coverage
  add column if not exists probes_errored integer not null default 0;

alter table coverage_runs
  add column if not exists probes_errored integer;

comment on column archive_coverage.probes_errored is
  'Verdicts discarded because verifyGrounding returned its catch-path failsafe rather than an auditor verdict. Excluded from state and from overreach; not evidence in either direction.';
comment on column archive_coverage.probes_total is
  'Usable verdicts in this domain on the last run. Excludes discarded failsafes, so an incomplete run reads as incomplete.';

-- Verification. Expect archive_coverage at 13 columns and coverage_runs at 17.
select table_name, count(*) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in ('coverage_runs', 'archive_coverage')
group by table_name
order by table_name;
