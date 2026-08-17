-- ── Coverage map, second dimension ────────────────────────────────────────────
-- Additive to 20260815_coverage_map.sql. Paste after it.
--
-- WHY. The first version collapsed the two ways a probe can fail to back
-- coverage. Both 'no_position' (the entity declined or hedged) and 'unsupported'
-- (the entity committed a position no deposit takes) were counted the same way,
-- as simply not-a-deposit. That is correct for the coverage state and it threw
-- away the most actionable signal in the data.
--
-- The distinction. In production an 'unsupported' draft never ships:
-- app/api/succession/entity/chat/route.ts replaces it with groundingGapReply. So
-- this does NOT measure what a successor receives. It measures how hard the
-- verifier is working, which is the same thing as how often a successor asking
-- in this domain hears "I did not settle this" instead of an answer.
--
-- An open domain with overreach 'none' is a quiet gap. An open domain with
-- overreach 'high' is where a successor hits the most refusals, and therefore
-- where one deposit buys the most. That ranking is what a founder needs and the
-- coverage state alone cannot express it.
--
-- Backfill note: rows written before this migration have no per-basis split
-- recorded on archive_coverage. The counts default to 0 and overreach defaults
-- to 'none', which reads as "no reaching observed" rather than "reaching
-- measured at zero." The raw bases are still in coverage_probe_results for any
-- run, so a historical map can be recomputed rather than guessed at. Do not
-- infer these values for old rows.

alter table archive_coverage
  add column if not exists probes_overreach integer not null default 0,
  add column if not exists probes_declined  integer not null default 0,
  add column if not exists overreach        text    not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'archive_coverage_overreach_check'
  ) then
    alter table archive_coverage
      add constraint archive_coverage_overreach_check
      check (overreach in ('none','some','high'));
  end if;
end $$;

alter table coverage_runs
  add column if not exists probes_overreach integer,
  add column if not exists probes_declined  integer;

comment on column archive_coverage.overreach is
  'none/some/high, computed over the probes in this domain that did NOT land on a deposit. Measures how often the entity reached past the archive before the verifier caught it. It does NOT describe what a successor receives; an overreaching draft is replaced with the honest gap reply before it ships.';
comment on column archive_coverage.probes_overreach is
  'Count of basis=unsupported in this domain on the last run.';
comment on column archive_coverage.probes_declined is
  'Count of basis=no_position in this domain on the last run.';

-- Verification. Expect archive_coverage at 12 columns and coverage_runs at 16.
select table_name, count(*) as columns
from information_schema.columns
where table_schema = 'public'
  and table_name in ('coverage_runs', 'archive_coverage')
group by table_name
order by table_name;
