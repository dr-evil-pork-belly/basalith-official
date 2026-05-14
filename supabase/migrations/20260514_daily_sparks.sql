-- Daily Spark system

CREATE TABLE IF NOT EXISTS daily_spark_responses (
  id               uuid        default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  archive_id       uuid        references archives(id) on delete cascade,
  contributor_id   uuid        references contributors(id),
  spark_id         text        not null,
  spark_text       text        not null,
  response_text    text,
  response_type    text        default 'text',  -- text | voice
  dimension        text,
  training_pair_id uuid,
  is_owner         boolean     default false
);

CREATE INDEX IF NOT EXISTS idx_spark_responses_contributor ON daily_spark_responses (contributor_id);
CREATE INDEX IF NOT EXISTS idx_spark_responses_archive     ON daily_spark_responses (archive_id);
CREATE INDEX IF NOT EXISTS idx_spark_responses_spark_id    ON daily_spark_responses (archive_id, spark_id);

ALTER TABLE daily_spark_responses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_spark_responses' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON daily_spark_responses
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;
