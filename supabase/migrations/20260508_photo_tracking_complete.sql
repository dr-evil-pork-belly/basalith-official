-- Complete photo send tracking — supersedes 20260508_contributor_photo_sends.sql
-- Run this in Supabase SQL editor. All statements are IF NOT EXISTS safe to re-run.

-- ── Contributor photo sends ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contributor_photo_sends (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  archive_id      uuid        REFERENCES archives(id)     ON DELETE CASCADE,
  contributor_id  uuid        REFERENCES contributors(id) ON DELETE CASCADE,
  photograph_id   uuid        REFERENCES photographs(id)  ON DELETE CASCADE,
  sent_at         timestamptz DEFAULT now(),
  responded       boolean     DEFAULT false,
  responded_at    timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_sends_unique
  ON contributor_photo_sends(contributor_id, photograph_id);

CREATE INDEX IF NOT EXISTS idx_photo_sends_contributor
  ON contributor_photo_sends(contributor_id);

CREATE INDEX IF NOT EXISTS idx_photo_sends_archive
  ON contributor_photo_sends(archive_id);

ALTER TABLE contributor_photo_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contributor_photo_sends' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON contributor_photo_sends
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

-- ── Owner photo sends ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS owner_photo_sends (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  archive_id      uuid        REFERENCES archives(id)     ON DELETE CASCADE,
  photograph_id   uuid        REFERENCES photographs(id)  ON DELETE CASCADE,
  sent_at         timestamptz DEFAULT now(),
  UNIQUE (archive_id, photograph_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_sends_archive
  ON owner_photo_sends(archive_id);

ALTER TABLE owner_photo_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'owner_photo_sends' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON owner_photo_sends
      TO service_role USING (true) WITH CHECK (true);
  END IF;
END; $$;

-- ── Backfill: mark photos contributors have already labeled as sent ───────────
-- This prevents contributors from receiving photos they already labeled.

INSERT INTO contributor_photo_sends
  (archive_id, contributor_id, photograph_id, sent_at, responded, responded_at)
SELECT DISTINCT
  l.archive_id,
  c.id            AS contributor_id,
  l.photograph_id,
  l.created_at    AS sent_at,
  true            AS responded,
  l.created_at    AS responded_at
FROM labels l
JOIN contributors c
  ON  c.archive_id = l.archive_id
  AND (c.name = l.labelled_by OR c.email = l.labelled_by)
WHERE c.id IS NOT NULL
  AND l.photograph_id IS NOT NULL
ON CONFLICT (contributor_id, photograph_id) DO NOTHING;

-- ── Backfill: email_sessions → owner_photo_sends ─────────────────────────────
-- Mark photos that have already been sent via the email system.

INSERT INTO owner_photo_sends (archive_id, photograph_id, sent_at)
SELECT DISTINCT archive_id, photograph_id, sent_at
FROM   email_sessions
WHERE  photograph_id IS NOT NULL
ON CONFLICT (archive_id, photograph_id) DO NOTHING;
