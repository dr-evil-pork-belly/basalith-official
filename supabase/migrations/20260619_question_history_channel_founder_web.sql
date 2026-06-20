-- ⚠ RUN MANUALLY IN THE SUPABASE SQL EDITOR (raw DDL — not via the sandbox).
--
-- question_history.channel has a CHECK constraint that currently allows only
-- 'daily_email' | 'mirror_thread' | 'app_companion' | 'app_spark'
-- (confirmed against information_schema 2026-06-11, recorded in
-- 20260611_elicitation_engine.sql line 60).
--
-- The founder web capture path serves B2B questions with channel 'founder_web'
-- via lib/selectNextQuestion.ts. Until this constraint is widened, that serve
-- INSERT silently fails (selectNextQuestion only console.warn's on insert
-- error), so the serve is never recorded — which means the dashboard re-serves
-- on every load and the readiness bars never advance.
--
-- The auto-generated name for a single-column CHECK is <table>_<column>_check.
-- If your constraint has a different name, adjust the DROP accordingly
-- (\d question_history will show it).

ALTER TABLE question_history DROP CONSTRAINT IF EXISTS question_history_channel_check;

ALTER TABLE question_history ADD CONSTRAINT question_history_channel_check
  CHECK (channel IN ('daily_email', 'mirror_thread', 'app_companion', 'app_spark', 'founder_web'));
