-- Daily sessions and journal entries for engagement loop

CREATE TABLE IF NOT EXISTS daily_sessions (
  id               uuid default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  archive_id       uuid references archives(id) on delete cascade,
  session_date     date not null,
  completed        boolean default false,
  completed_at     timestamptz,
  steps_completed  integer default 0,
  deposits_added   integer default 0,
  duration_seconds integer,
  UNIQUE(archive_id, session_date)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id               uuid default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  archive_id       uuid references archives(id) on delete cascade,
  entry_date       date not null,
  content          text,
  voice_path       text,
  duration_seconds integer,
  mood             text,
  training_pair_id uuid,
  UNIQUE(archive_id, entry_date)
);

ALTER TABLE archives
  ADD COLUMN IF NOT EXISTS current_streak   integer default 0,
  ADD COLUMN IF NOT EXISTS longest_streak   integer default 0,
  ADD COLUMN IF NOT EXISTS last_session_date date;

ALTER TABLE daily_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_sessions' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON daily_sessions
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'journal_entries' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON journal_entries
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;
