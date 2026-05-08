-- Story Prompt System + Remember When Game
-- Run in Supabase SQL editor.

-- ── contributor_story_prompts ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contributor_story_prompts (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  archive_id       uuid        REFERENCES archives(id)     ON DELETE CASCADE,
  contributor_id   uuid        REFERENCES contributors(id) ON DELETE CASCADE,
  prompt_id        text        NOT NULL,
  prompt_text      text        NOT NULL,
  dimension        text,
  sent_at          timestamptz DEFAULT now(),
  answered         boolean     DEFAULT false,
  answer_text      text,
  answered_at      timestamptz,
  training_pair_id uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_prompts_unique
  ON contributor_story_prompts(contributor_id, prompt_id);

CREATE INDEX IF NOT EXISTS idx_story_prompts_archive
  ON contributor_story_prompts(archive_id);

ALTER TABLE contributor_story_prompts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contributor_story_prompts' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON contributor_story_prompts
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

-- ── Extend memory_game_sessions for story mode ───────────────────────────────
-- Adds columns needed for text-scenario game. Existing photo game rows
-- will have NULL in these new columns — that is fine.

ALTER TABLE memory_game_sessions
  ADD COLUMN IF NOT EXISTS game_type     text DEFAULT 'photo',
  ADD COLUMN IF NOT EXISTS scenario_text text,
  ADD COLUMN IF NOT EXISTS scenario_type text,
  ADD COLUMN IF NOT EXISTS dimension     text,
  ADD COLUMN IF NOT EXISTS reveal_at     timestamptz,
  ADD COLUMN IF NOT EXISTS metadata      jsonb DEFAULT '{}';

-- Back-fill game_type for existing rows
UPDATE memory_game_sessions SET game_type = 'photo' WHERE game_type IS NULL;

-- ── memory_game_responses ────────────────────────────────────────────────────
-- New responses table for story-mode game (separate from photo-game contributions).

CREATE TABLE IF NOT EXISTS memory_game_responses (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  session_id       uuid        REFERENCES memory_game_sessions(id) ON DELETE CASCADE,
  archive_id       uuid        REFERENCES archives(id)     ON DELETE CASCADE,
  contributor_id   uuid        REFERENCES contributors(id),
  is_owner         boolean     DEFAULT false,
  response_text    text        NOT NULL,
  response_type    text        DEFAULT 'text',
  training_pair_id uuid
);

CREATE INDEX IF NOT EXISTS idx_game_responses_session
  ON memory_game_responses(session_id);

CREATE INDEX IF NOT EXISTS idx_game_responses_archive
  ON memory_game_responses(archive_id);

ALTER TABLE memory_game_responses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'memory_game_responses' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON memory_game_responses
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;
