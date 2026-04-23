-- Fast phone lookup indexes for Twilio call-in routing.
-- Reduces archives/contributors phone queries from ~1050ms to <50ms.

CREATE INDEX IF NOT EXISTS idx_archives_owner_phone
  ON archives(owner_phone)
  WHERE owner_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contributors_phone
  ON contributors(phone)
  WHERE phone IS NOT NULL;
