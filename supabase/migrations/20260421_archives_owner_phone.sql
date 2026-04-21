-- Add owner_phone to archives for Twilio call-in by the archive owner
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS owner_phone text;

CREATE INDEX IF NOT EXISTS archives_owner_phone_idx
  ON archives (owner_phone)
  WHERE owner_phone IS NOT NULL;

-- Set David's number (run after migration)
-- UPDATE archives SET owner_phone = '+16268638167'
-- WHERE id = '1783f9cf-19b5-486e-8c84-800f85f665c0';
