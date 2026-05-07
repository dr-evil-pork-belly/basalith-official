-- Guide Portal: certification, quality scoring, Stripe Connect

-- ── Certification tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guide_certifications (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          timestamptz DEFAULT now(),
  archivist_id        uuid        REFERENCES archivists(id) ON DELETE CASCADE,
  module_1_status     text        DEFAULT 'available',
  module_1_score      integer,
  module_1_passed_at  timestamptz,
  module_2_status     text        DEFAULT 'locked',
  module_2_score      integer,
  module_2_passed_at  timestamptz,
  module_3_status     text        DEFAULT 'locked',
  module_3_score      integer,
  module_3_passed_at  timestamptz,
  certified_at        timestamptz,
  certification_level text        DEFAULT 'associate',
  badge_issued        boolean     DEFAULT false
);

CREATE TABLE IF NOT EXISTS guide_module_answers (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now(),
  archivist_id   uuid        REFERENCES archivists(id),
  module_number  integer,
  question_id    text,
  answer         text,
  score          integer,
  feedback       text,
  attempt_number integer     DEFAULT 1
);

-- ── Archivist table additions ─────────────────────────────────────────────────

ALTER TABLE archivists
  ADD COLUMN IF NOT EXISTS certification_status   text         DEFAULT 'uncertified',
  ADD COLUMN IF NOT EXISTS certification_level    text         DEFAULT 'associate',
  ADD COLUMN IF NOT EXISTS quality_score          numeric(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_archives        integer      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_retention_rate  numeric(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_account_id      text,
  ADD COLUMN IF NOT EXISTS stripe_account_status  text         DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS total_closings         integer      DEFAULT 0;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_guide_certifications_archivist
  ON guide_certifications(archivist_id);

CREATE INDEX IF NOT EXISTS idx_guide_answers_archivist
  ON guide_module_answers(archivist_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE guide_certifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_module_answers  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guide_certifications' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON guide_certifications
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guide_module_answers' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON guide_module_answers
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

-- ── Auto-create certification record on new archivist ────────────────────────

CREATE OR REPLACE FUNCTION create_guide_certification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO guide_certifications (archivist_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_guide_certification ON archivists;
CREATE TRIGGER trg_create_guide_certification
  AFTER INSERT ON archivists
  FOR EACH ROW EXECUTE FUNCTION create_guide_certification();

-- Backfill existing archivists
INSERT INTO guide_certifications (archivist_id)
SELECT id FROM archivists
WHERE id NOT IN (SELECT archivist_id FROM guide_certifications WHERE archivist_id IS NOT NULL)
ON CONFLICT DO NOTHING;
