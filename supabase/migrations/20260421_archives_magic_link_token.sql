ALTER TABLE archives ADD COLUMN IF NOT EXISTS magic_link_token text;
ALTER TABLE archives ADD COLUMN IF NOT EXISTS magic_link_created_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS archives_magic_link_token_idx
  ON archives (magic_link_token)
  WHERE magic_link_token IS NOT NULL;
