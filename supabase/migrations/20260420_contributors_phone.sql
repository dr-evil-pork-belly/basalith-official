-- Add phone column to contributors for Twilio call-in recording
ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS phone text;

-- Index for fast lookup on incoming Twilio calls
CREATE INDEX IF NOT EXISTS contributors_phone_idx
  ON contributors (phone)
  WHERE phone IS NOT NULL;
