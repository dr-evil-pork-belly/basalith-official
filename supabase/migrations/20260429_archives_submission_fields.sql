-- Add guide submission fields to archives
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS billing          TEXT    DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS relationship_type TEXT,
  ADD COLUMN IF NOT EXISTS guide_notes       TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by      UUID    REFERENCES archivists(id),
  ADD COLUMN IF NOT EXISTS payment_url       TEXT;

-- Add new pipeline statuses for prospects (no schema change needed — status is TEXT)
-- New valid values: 'Payment Pending', 'Submitted'
-- Existing: 'New' | 'Contacted' | 'Demo' | 'Proposal' | 'Active Client' | 'Lost'
