-- Add photograph_id to contributor_questions.
-- The column is referenced in all selects and inserts but was missing from the
-- original CREATE TABLE. Safe to run even if it already exists.

ALTER TABLE contributor_questions
  ADD COLUMN IF NOT EXISTS photograph_id UUID REFERENCES photographs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contributor_questions_photograph
  ON contributor_questions(photograph_id) WHERE photograph_id IS NOT NULL;
