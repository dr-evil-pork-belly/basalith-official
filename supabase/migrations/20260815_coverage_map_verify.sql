-- ── Coverage map, post-migration verification ─────────────────────────────────
-- Paste this into the Supabase SQL editor AFTER 20260815_coverage_map.sql and
-- read the four result sets. This creates nothing and changes nothing.
--
-- The point is to confirm the migration landed as written rather than to confirm
-- it ran without an error message. A CREATE TABLE IF NOT EXISTS against a table
-- that already exists in a different shape succeeds silently, so "no error" is
-- not evidence.

-- 1. THE THREE TABLES EXIST. Expect exactly 3 rows.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('coverage_runs', 'coverage_probe_results', 'archive_coverage')
order by table_name;

-- 2. RLS IS ON AND THE SERVICE-ROLE POLICY IS THE ONLY POLICY.
-- Expect 3 rows, every one with rowsecurity = true and policy_count = 1.
-- A policy_count above 1, or any policy whose role is not service_role, means a
-- public read path exists on an internal table. That is the failure this query
-- is here to catch.
select
  c.relname                                as table_name,
  c.relrowsecurity                         as rowsecurity,
  count(p.polname)                         as policy_count,
  coalesce(string_agg(p.polname, ', '), '(none)') as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('coverage_runs', 'coverage_probe_results', 'archive_coverage')
group by c.relname, c.relrowsecurity
order by c.relname;

-- 3. THE CONSTRAINTS THAT CARRY THE CORRECTNESS ARGUMENT.
-- Expect to see, at minimum:
--   coverage_runs_one_in_flight        UNIQUE, partial, WHERE finished_at IS NULL
--   coverage_probe_results_run_probe   UNIQUE on (run_id, probe_key)
--   archive_coverage_pkey              PRIMARY KEY on (archive_id, domain)
--
-- coverage_runs_one_in_flight is the one that matters most. It is the backstop
-- that stops two concurrent runs interleaving upserts into archive_coverage and
-- leaving a map that matches neither. If it is missing, the in-flight check in
-- runCoverage is the ONLY guard and a duplicate event delivery can race it.
select
  i.relname as index_name,
  t.relname as table_name,
  pg_get_indexdef(i.oid) as definition
from pg_class t
join pg_namespace n on n.oid = t.relnamespace
join pg_index x on x.indrelid = t.oid
join pg_class i on i.oid = x.indexrelid
where n.nspname = 'public'
  and t.relname in ('coverage_runs', 'coverage_probe_results', 'archive_coverage')
order by t.relname, i.relname;

-- 4. THE CHECK CONSTRAINTS.
-- Expect basis limited to deposit/no_position/unsupported, state limited to
-- backed/partial/open, and trigger_source limited to manual/cron/transition.
--
-- The state constraint is load bearing beyond data hygiene: it is what makes it
-- impossible to write a numeric score into this schema later without an explicit
-- migration that a reviewer has to read.
select
  rel.relname as table_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and con.contype = 'c'
  and rel.relname in ('coverage_runs', 'coverage_probe_results', 'archive_coverage')
order by rel.relname, con.conname;

-- 5. THE COLUMNS. Expect exactly:
--   coverage_runs           14 columns
--   coverage_probe_results   8 columns
--   archive_coverage         9 columns
--
-- Checks 1 through 4 all pass on a table that exists in the WRONG shape, because
-- indexes, policies, and check constraints are all named objects that either
-- exist or do not. A column silently absent from a pre-existing table shows up
-- in none of them, and would first surface as a runtime write failure in the
-- middle of a 48 model call run.
--
-- The columns most worth confirming by eye are the ones a reviewer would not
-- miss if they vanished: coverage_runs.off_label and coverage_runs.complete,
-- which are what stop a diagnostic or short run being read as a real one, and
-- archive_coverage.damped, which is what makes hysteresis auditable rather than
-- invisible.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('coverage_runs', 'coverage_probe_results', 'archive_coverage')
order by table_name, ordinal_position;

-- 6. COLUMN COUNTS, if you would rather read three numbers than fifty rows.
-- Expect exactly: archive_coverage 9, coverage_probe_results 8, coverage_runs 14.
select table_name, count(*) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in ('coverage_runs', 'coverage_probe_results', 'archive_coverage')
group by table_name
order by table_name;
