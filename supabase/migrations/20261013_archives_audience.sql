-- Question lenses: who a record's questions are written for. October 13, 2026.
-- Record: docs/QUESTION_LENSES_2026-10-13.md. Code: lib/questionLens.ts.
--
-- Additive. Pasted by hand into the Supabase SQL editor; never run from the
-- CLI or a script. One nullable text column, null on every existing row and
-- on every new row that does not come through the church door.
--
-- The only value written today is 'church', by POST /api/trial/start when a
-- person arrives from /churches and says they lead one. No CHECK is added,
-- for the same reason archives.status has none: the next value is a
-- convention documented in CLAUDE.md section 4, not a migration. Code treats
-- any value it does not know as no audience (lensFor in lib/questionLens.ts).
--
-- What reads it: lib/questionLensStore.ts, when a call opens, to pick the
-- openers and the wording of a few probes. Nothing else. It never reaches the
-- entity prompt, the frozen layer, the verifier, or a coverage run
-- (lib/questionLens.test.ts pins that on source text).
--
-- Safe in either order with the deploy. Before this is pasted, the read in
-- lib/questionLensStore.ts fails closed to "no audience" and a church signup
-- is created without the column and reported in the internal notice.
--
-- No grant or policy changes: a column takes the table's row level security
-- and privileges as they stand.

alter table archives
  add column if not exists audience text;

comment on column archives.audience is
  'Who the questions are written for. Null for almost every row. ''church'' = a pastor or an elder (set at /begin from /churches). Steers question wording only; never evidence. See lib/questionLens.ts.';

-- Confirm after paste (expect one row: audience, text, YES):
--
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public'
--     and table_name = 'archives'
--     and column_name = 'audience';
--
-- To mark an existing record by hand (for example a pastor who signed up
-- through the main door before today). Run only between calls: a call that is
-- already open keeps the lens it opened with.
--
--   update archives set audience = 'church' where id = '<archive id>';
