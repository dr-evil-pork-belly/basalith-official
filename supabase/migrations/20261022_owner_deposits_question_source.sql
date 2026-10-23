-- Who wrote the question a deposit answers. October 22, 2026.
-- claude/BASALITH_CONVERSATIONAL_INTERVIEW_2026-10-22.md, section 4 and R2.
--
-- WHY. Until today every follow up in a call was a fixed sentence from
-- lib/renderProbe.ts. The interviewer (lib/interviewer.ts) now writes some of
-- them, on records named for the A/B. The deposit keeps the question actually
-- asked as its prompt, because storing a sentence that was never asked would
-- misstate the record. This column says who wrote it.
--
-- VALUES.
--   'interviewer'  written by the interviewer and passed the guard
--   'spine'        the fixed sentence, on a call that is part of the A/B
--   null           not recorded: every deposit before October 22, 2026, and
--                  every deposit from a call that is not part of the A/B
--
-- SAFE ON AN APPEND ONLY TABLE. owner_deposits refuses UPDATE and DELETE
-- (20260921_owner_deposits_append_only.sql). Adding a nullable column with no
-- default rewrites no row and fires no row trigger. No existing row changes.
--
-- SAFE BEFORE OR AFTER THE DEPLOY. The route names this column only on an
-- armed call, and retries without it if the insert fails on it. Paste this
-- before setting CONVERSATIONAL_INTERVIEW, so the first A/B rows carry it.
--
-- No grant change. The column inherits the table's grants and RLS.

alter table owner_deposits
  add column if not exists question_source text;

alter table owner_deposits
  drop constraint if exists owner_deposits_question_source_check;

alter table owner_deposits
  add constraint owner_deposits_question_source_check
  check (question_source is null or question_source in ('interviewer', 'spine'));

comment on column owner_deposits.question_source is
  'Who wrote the prompt this deposit answers: interviewer (model written, guarded) or spine (fixed sentence). Null when not recorded. See lib/conversationalInterview.ts.';

-- CONFIRM. Expect one row: question_source, text, YES.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'owner_deposits'
  and column_name = 'question_source';

-- Expect one row: owner_deposits_question_source_check.
select conname
from pg_constraint
where conrelid = 'owner_deposits'::regclass
  and conname = 'owner_deposits_question_source_check';
