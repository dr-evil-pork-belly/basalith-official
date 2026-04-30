-- Entity access controls on the archives table
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS contributor_entity_access      TEXT      DEFAULT 'none',
  -- none | preview | open
  ADD COLUMN IF NOT EXISTS entity_access_enabled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entity_readiness_score         INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entity_preview_contributor_ids UUID[]    DEFAULT '{}';
