-- Tier restructure: archive/estate/dynasty → active/resting/legacy
-- Run this after 20260511_archive_pause_system.sql

-- Migrate all existing archives to 'active' tier
UPDATE archives
SET tier = 'active'
WHERE tier IN ('archive', 'estate', 'dynasty');

-- Add new pause/lifecycle columns (safe to run again — IF NOT EXISTS)
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS resting_since           timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_activated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_paid_at          timestamptz;

-- Update prospects table tier references
UPDATE prospects
SET tier_sold = 'active'
WHERE tier_sold IN ('archive', 'estate', 'dynasty');

-- Indexes for new tier queries
CREATE INDEX IF NOT EXISTS idx_archives_tier ON archives (tier);
