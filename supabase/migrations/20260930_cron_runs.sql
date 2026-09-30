-- Run ledger, slice 1. September 30, 2026.
-- Recon: docs/RUN_LEDGER_SLICE_1_2026-09-30.md. Writer: lib/cronRun.ts.
--
-- One row per scheduled run, written by the job itself. Opened before the work
-- starts, closed when it ends. A row with finished_at null is a run that died
-- without unwinding.
--
-- Additive. Touches no existing table. Pasted by hand into the Supabase SQL
-- editor; never run from the CLI or a script.
--
-- No foreign key to archives on purpose: this table is about jobs, not about
-- any one Basalith, and summary holds counts only (no names, emails, storage
-- paths, or archive ids).

create table if not exists cron_runs (
  id          uuid        primary key default gen_random_uuid(),
  job         text        not null,
  scheduler   text        not null check (scheduler in ('vercel','inngest')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  outcome     text        check (outcome in ('ok','failed','skipped')),
  summary     jsonb,
  error       text,
  -- A closed row has an outcome and an open row has none.
  constraint cron_runs_closed_has_outcome
    check ((finished_at is null) = (outcome is null))
);

create index if not exists cron_runs_job_started
  on cron_runs (job, started_at desc);

comment on table cron_runs is
  'One row per scheduled run, written by the job itself (lib/cronRun.ts). Operational evidence only.';
comment on column cron_runs.job is
  'Stable job name. The cron route folder name or the Inngest function id.';
comment on column cron_runs.finished_at is
  'Null while running. Still null long after started_at means the run died without unwinding.';
comment on column cron_runs.outcome is
  'ok means the job did its real work. A gate skip, dry run, or test call is skipped. failed carries error.';
comment on column cron_runs.summary is
  'Counts only. Never names, emails, storage paths, or archive ids.';

-- Supabase grants anon and authenticated seven privileges on every new table.
-- RLS with a service_role-only policy is the defense; the revoke makes it two.
alter table cron_runs enable row level security;

drop policy if exists "service_role_full_access" on cron_runs;
create policy "service_role_full_access" on cron_runs
  to service_role using (true) with check (true);

revoke all on table cron_runs from public, anon, authenticated;

-- Confirm after paste. Paste the output of all three back.
--
--   -- 1. Columns.
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'cron_runs' order by ordinal_position;
--
--   -- 2. Grants. Expect no row for anon, authenticated, or PUBLIC.
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_name = 'cron_runs' order by grantee, privilege_type;
--
--   -- 3. RLS on, one policy, service_role only.
--   select c.relrowsecurity, p.polname, p.polroles::regrole[]
--   from pg_class c left join pg_policy p on p.polrelid = c.oid
--   where c.relname = 'cron_runs';
