-- Additions to certification tables (extends 20260506_guide_portal.sql)

ALTER TABLE guide_certifications
  ADD COLUMN IF NOT EXISTS module_1_attempts   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module_2_attempts   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module_3_attempts   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_available_at  timestamptz;

ALTER TABLE guide_module_answers
  ADD COLUMN IF NOT EXISTS strength     text,
  ADD COLUMN IF NOT EXISTS improvement  text;
