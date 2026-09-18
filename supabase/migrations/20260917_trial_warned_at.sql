-- Self-serve trial, slice B. September 17, 2026.
-- Skeleton: docs/SELF_SERVE_SKELETON_2026-09-17.md section 2.1.
--
-- Additive. Pasted by hand into the Supabase SQL editor; never run from the
-- CLI or a script. The column is the idempotency key for the day 23 warning
-- (lib/inngest/trialFunctions.ts trialWarn): the email is sent first, then
-- the row is marked, so a failed send never marks the row warned.

alter table archives add column if not exists trial_warned_at timestamptz;
comment on column archives.trial_warned_at is
  'Set when the day 23 trial warning email was sent. Idempotency key for trialWarn.';

-- Confirm after paste:
--
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_name = 'archives' and column_name = 'trial_warned_at';
