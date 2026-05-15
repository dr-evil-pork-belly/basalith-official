-- Email reply sessions: token-based routing for spark and story prompt replies
CREATE TABLE IF NOT EXISTS email_reply_sessions (
  id             uuid        default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  token          text        unique not null,
  archive_id     uuid        references archives(id) on delete cascade,
  contributor_id uuid        references contributors(id) on delete cascade,
  email_type     text        not null,  -- 'spark' | 'story_prompt' | 'photograph'
  spark_id       text,
  prompt_id      text,
  replied        boolean     default false,
  replied_at     timestamptz,
  expires_at     timestamptz default (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_email_reply_sessions_token     ON email_reply_sessions (token);
CREATE INDEX IF NOT EXISTS idx_email_reply_sessions_archive   ON email_reply_sessions (archive_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_reply_sessions_contrib   ON email_reply_sessions (contributor_id);

ALTER TABLE email_reply_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_reply_sessions' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON email_reply_sessions TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

-- Also add answer_text column to contributor_story_prompts if not exists
ALTER TABLE contributor_story_prompts
  ADD COLUMN IF NOT EXISTS answered    boolean     default false,
  ADD COLUMN IF NOT EXISTS answer_text text,
  ADD COLUMN IF NOT EXISTS answered_at timestamptz;
