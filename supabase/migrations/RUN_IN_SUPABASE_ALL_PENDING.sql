-- ============================================================
-- CONSOLIDATED PENDING MIGRATIONS — run once in Supabase SQL editor
-- All ALTER TABLE ... ADD COLUMN IF NOT EXISTS are idempotent.
-- Safe to run even if some columns already exist.
-- ============================================================

-- ── 20260429: Guide submission fields on archives ──────────────────────────────
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS billing           TEXT        DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS relationship_type TEXT,
  ADD COLUMN IF NOT EXISTS guide_notes       TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by      UUID        REFERENCES archivists(id),
  ADD COLUMN IF NOT EXISTS payment_url       TEXT;

-- ── 20260430: Entity access controls on archives ───────────────────────────────
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS contributor_entity_access      TEXT        DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS entity_access_enabled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entity_readiness_score         INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entity_preview_contributor_ids UUID[]      DEFAULT '{}';

-- ── 20260430: Memory confirmation + contributor questions ──────────────────────
ALTER TABLE owner_deposits
  ADD COLUMN IF NOT EXISTS contributor_id   UUID        REFERENCES contributors(id),
  ADD COLUMN IF NOT EXISTS contributor_name TEXT,
  ADD COLUMN IF NOT EXISTS times_accessed   INTEGER     DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_deposit_access(deposit_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE owner_deposits
  SET times_accessed = times_accessed + 1
  WHERE id = ANY(deposit_ids);
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_owner_deposits_contributor
  ON owner_deposits(contributor_id) WHERE contributor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_owner_deposits_times_accessed
  ON owner_deposits(times_accessed) WHERE times_accessed > 0;

CREATE TABLE IF NOT EXISTS contributor_questions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id     UUID        NOT NULL REFERENCES archives(id)     ON DELETE CASCADE,
  contributor_id UUID        NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  question_text  TEXT        NOT NULL,
  question_type  TEXT        NOT NULL DEFAULT 'relationship_specific',
  dimension      TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending',
  answered_at    TIMESTAMPTZ,
  answer_text    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contributor_questions_contributor
  ON contributor_questions(contributor_id, status);

CREATE INDEX IF NOT EXISTS idx_contributor_questions_archive
  ON contributor_questions(archive_id, created_at DESC);

-- ── Verify: check all new columns exist ────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'archives'
  AND column_name IN (
    'billing', 'relationship_type', 'guide_notes', 'submitted_by', 'payment_url',
    'contributor_entity_access', 'entity_access_enabled_at',
    'entity_readiness_score', 'entity_preview_contributor_ids'
  )
ORDER BY column_name;
