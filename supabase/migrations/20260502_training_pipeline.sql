-- ── Training pairs table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_pairs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  archive_id            UUID        REFERENCES archives(id) ON DELETE CASCADE,
  source_id             UUID,
  source_type           TEXT        NOT NULL,
  -- deposit | voice | wisdom | contributor | label
  prompt                TEXT        NOT NULL,
  completion            TEXT        NOT NULL,
  system_prompt         TEXT,
  quality_score         INTEGER,
  -- 0-100, null until scored
  specificity_score     INTEGER,
  authenticity_score    INTEGER,
  trainability_score    INTEGER,
  length_score          INTEGER,
  word_count            INTEGER,
  included_in_training  BOOLEAN     DEFAULT FALSE,
  training_run_id       UUID,
  language              TEXT        DEFAULT 'en',
  metadata              JSONB       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_training_pairs_archive
  ON training_pairs(archive_id);
CREATE INDEX IF NOT EXISTS idx_training_pairs_included
  ON training_pairs(archive_id) WHERE included_in_training = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_pairs_quality
  ON training_pairs(quality_score) WHERE quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_pairs_source
  ON training_pairs(source_id, source_type) WHERE source_id IS NOT NULL;

ALTER TABLE training_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON training_pairs
  TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ── Training runs table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_runs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  archive_id            UUID        REFERENCES archives(id) ON DELETE CASCADE,
  status                TEXT        DEFAULT 'pending',
  -- pending | preparing | training | complete | failed
  model_base            TEXT        DEFAULT 'meta-llama/Meta-Llama-3.1-8B-Instruct',
  training_pair_count   INTEGER,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  model_id              TEXT,
  notes                 TEXT,
  metadata              JSONB       DEFAULT '{}'
);

ALTER TABLE training_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON training_runs
  TO service_role USING (TRUE) WITH CHECK (TRUE);
