-- Add photograph_id to email_reply_sessions for photograph-type reply routing
ALTER TABLE email_reply_sessions
  ADD COLUMN IF NOT EXISTS photograph_id UUID REFERENCES photographs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_reply_sessions_photograph
  ON email_reply_sessions(photograph_id) WHERE photograph_id IS NOT NULL;
