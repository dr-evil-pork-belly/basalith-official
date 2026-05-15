-- Feature 2: Wisdom Exchange
CREATE TABLE IF NOT EXISTS wisdom_exchanges (
  id                  uuid        default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  archive_id          uuid        references archives(id) on delete cascade,
  contributor_id      uuid        references contributors(id),
  question            text        not null,
  question_context    text,
  entity_response     text,
  entity_responded_at timestamptz,
  owner_reviewed      boolean     default false,
  owner_correction    text,
  owner_reviewed_at   timestamptz,
  status              text        default 'pending', -- pending|answered|reviewed|approved|ignored
  training_pair_id    uuid,
  is_public           boolean     default false
);

CREATE INDEX IF NOT EXISTS idx_wisdom_exchanges_archive ON wisdom_exchanges (archive_id, status);
CREATE INDEX IF NOT EXISTS idx_wisdom_exchanges_contrib ON wisdom_exchanges (contributor_id);

ALTER TABLE wisdom_exchanges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wisdom_exchanges' AND policyname = 'service_role_full_access') THEN
    CREATE POLICY "service_role_full_access" ON wisdom_exchanges TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

-- Feature 3: Voice Portraits
CREATE TABLE IF NOT EXISTS voice_portraits (
  id                      uuid        default gen_random_uuid() primary key,
  created_at              timestamptz default now(),
  archive_id              uuid        references archives(id) on delete cascade,
  script_text             text        not null,
  audio_path              text,
  duration_seconds        integer,
  month                   text,  -- '2026-05'
  sent_to_contributors    boolean     default false,
  sent_at                 timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_portraits_archive ON voice_portraits (archive_id, created_at);

ALTER TABLE voice_portraits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_portraits' AND policyname = 'service_role_full_access') THEN
    CREATE POLICY "service_role_full_access" ON voice_portraits TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

-- Feature 3: ElevenLabs columns on archives
ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id  text,
  ADD COLUMN IF NOT EXISTS voice_cloned_at      timestamptz,
  ADD COLUMN IF NOT EXISTS voice_samples_count  integer default 0;
