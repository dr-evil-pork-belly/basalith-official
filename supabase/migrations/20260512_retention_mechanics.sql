-- Retention mechanics database additions

-- Mechanic 6: family reaction feed
ALTER TABLE contributor_questions
  ADD COLUMN IF NOT EXISTS owner_notified     boolean     default false,
  ADD COLUMN IF NOT EXISTS owner_notified_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_cq_owner_notified
  ON contributor_questions (archive_id, owner_notified, answered_at)
  WHERE owner_notified = false;

-- Mechanic 3: anniversary triggers — ensure significant_dates has needed columns
-- (month, day, year, person_name, date_type already exist per dates API)
ALTER TABLE significant_dates
  ADD COLUMN IF NOT EXISTS label            text,
  ADD COLUMN IF NOT EXISTS notify_annually  boolean default true;

-- Mechanic 7: annual preview tracking
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS last_annual_preview_year integer;
