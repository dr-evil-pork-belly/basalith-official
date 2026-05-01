-- Feature 2: Memory Confirmation — track deposit usage + contributor attribution
ALTER TABLE owner_deposits
  ADD COLUMN IF NOT EXISTS contributor_id   UUID REFERENCES contributors(id),
  ADD COLUMN IF NOT EXISTS contributor_name TEXT,
  ADD COLUMN IF NOT EXISTS times_accessed   INTEGER DEFAULT 0;

-- RPC for atomic increment (called from entity-chat)
CREATE OR REPLACE FUNCTION increment_deposit_access(deposit_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE owner_deposits
  SET times_accessed = times_accessed + 1
  WHERE id = ANY(deposit_ids);
END;
$$ LANGUAGE plpgsql;

-- Indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_owner_deposits_contributor
  ON owner_deposits(contributor_id) WHERE contributor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_owner_deposits_times_accessed
  ON owner_deposits(times_accessed) WHERE times_accessed > 0;

-- Feature 1: Personalized contributor questions table
CREATE TABLE IF NOT EXISTS contributor_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id     UUID NOT NULL REFERENCES archives(id)     ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  question_type  TEXT NOT NULL DEFAULT 'relationship_specific',
  dimension      TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  answered_at    TIMESTAMPTZ,
  answer_text    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributor_questions_contributor
  ON contributor_questions(contributor_id, status);
CREATE INDEX IF NOT EXISTS idx_contributor_questions_archive
  ON contributor_questions(archive_id, created_at DESC);
