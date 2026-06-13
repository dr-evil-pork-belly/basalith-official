-- Eval harness: runs + per-test results, scoped to an archive and (optionally) a training run.
-- owner_deposits.eval_holdout already exists in the live schema; statement kept idempotent
-- so this migration is safe to re-run against a fresh database.
alter table owner_deposits
  add column if not exists eval_holdout boolean not null default false;

create table if not exists eval_runs (
  id               uuid primary key default gen_random_uuid(),
  archive_id       uuid not null references archives(id) on delete cascade,
  training_run_id  uuid references training_runs(id),
  created_at       timestamptz not null default now(),
  config           jsonb not null
  -- config records: judge model + version tag, generator path version,
  -- holdout count, prompt template hashes. Changing any of these makes
  -- runs non-comparable; the config is what makes that visible.
);

create table if not exists eval_results (
  id          bigserial primary key,
  eval_run_id uuid not null references eval_runs(id) on delete cascade,
  test_type   text not null check (test_type in ('voice','content','reasoning','live_signal')),
  metric      text not null,
  value       numeric,
  n           int,
  details     jsonb
);

create index if not exists idx_eval_runs_archive_id on eval_runs (archive_id);
create index if not exists idx_eval_results_eval_run_id on eval_results (eval_run_id);

alter table eval_runs enable row level security;
create policy "service_role_full_access" on eval_runs
  to service_role using (true) with check (true);

alter table eval_results enable row level security;
create policy "service_role_full_access" on eval_results
  to service_role using (true) with check (true);
