-- WeChat Official Account integration
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS wechat_open_id   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS wechat_link_code TEXT UNIQUE;

ALTER TABLE contributors
  ADD COLUMN IF NOT EXISTS wechat_open_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_archives_wechat
  ON archives(wechat_open_id) WHERE wechat_open_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_archives_wechat_link_code
  ON archives(wechat_link_code) WHERE wechat_link_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contributors_wechat
  ON contributors(wechat_open_id) WHERE wechat_open_id IS NOT NULL;

-- Generate 6-char link codes for existing archives that don't have one
-- (run manually or via backfill route)
