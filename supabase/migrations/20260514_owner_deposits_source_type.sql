-- Add source_type to owner_deposits for deposit origin tracking
ALTER TABLE owner_deposits
  ADD COLUMN IF NOT EXISTS source_type text default 'deposit';

CREATE INDEX IF NOT EXISTS idx_owner_deposits_source_type
  ON owner_deposits (archive_id, source_type);
