-- Archive pause and preservation system
-- Adds columns for paused/terminated status tracking

ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS paused_at                  timestamptz,
  ADD COLUMN IF NOT EXISTS pause_reason               text,
  ADD COLUMN IF NOT EXISTS resume_count               integer default 0,
  ADD COLUMN IF NOT EXISTS termination_requested_at   timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at      timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id         text;

-- Index for fast subscription lookup (webhook path)
CREATE INDEX IF NOT EXISTS idx_archives_stripe_subscription
  ON archives (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Index for scheduled deletion job
CREATE INDEX IF NOT EXISTS idx_archives_scheduled_deletion
  ON archives (scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;

-- RLS: existing policies cover all writes via service role
-- No new RLS policies needed; service role bypasses RLS
