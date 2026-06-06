-- mirror_reflections — weekly "being noticed" reflections generated from an
-- owner's deposits, plus the next thread question and the owner's reaction.

CREATE TABLE IF NOT EXISTS mirror_reflections (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id      UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  reflection      TEXT        NOT NULL,
  thread_question TEXT        NOT NULL,
  deposit_ids     UUID[]      DEFAULT '{}',
  week_of         DATE        NOT NULL,
  owner_reaction  TEXT,
  reacted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mirror_reflections ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation (same end state as a plain CREATE POLICY, but safe
-- to re-run — matches the convention used by scripts/migrate-b2b.ts).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mirror_reflections'
      AND policyname = 'service_role_all_mirror_reflections'
  ) THEN
    CREATE POLICY "service_role_all_mirror_reflections" ON mirror_reflections
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mirror_archive ON mirror_reflections(archive_id, created_at DESC);
