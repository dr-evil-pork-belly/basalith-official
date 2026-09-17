-- Self-serve trial archives. Slice A, September 17, 2026.
-- Skeleton: docs/SELF_SERVE_SKELETON_2026-09-17.md section 1.1.
--
-- Additive. Pasted by hand into the Supabase SQL editor; never run from the
-- CLI or a script. No CHECK is added to archives.status: 'trial' joins
-- 'active' and 'drill' as a convention documented in CLAUDE.md section 4,
-- and lib/cronGates.test.ts is the guard that keeps every cron on
-- status = 'active'.

alter table archives
  add column if not exists trial_expires_at timestamptz,
  add column if not exists trial_started_at timestamptz,
  add column if not exists converted_at timestamptz;

create index if not exists archives_trial_expires_idx
  on archives (trial_expires_at)
  where status = 'trial';

comment on column archives.trial_expires_at is
  'Set on trial creation to trial_started_at + 30 days. Cleared on conversion. The deletion job selects on it.';

-- Confirm after paste:
--
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'archives'
--     and (column_name like 'trial%' or column_name = 'converted_at');
