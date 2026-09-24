-- ── Record threads, extractor t2 ─────────────────────────────────────────────
-- Follows 20260924_record_threads.sql. Same day, after reading the first real
-- backfill (Dr Ha, 106 deposits, 139 threads, 0 errors). Record:
-- docs/TAILORED_QUESTIONS_SLICE_1_2026-09-24.md, section "t1 read and t2".
--
-- What t1 got wrong, and what this migration adds for t2:
--   1. One person became seven threads. t2 shows the model the Basalith's
--      existing threads and lets it ATTACH a mention to one of them.
--      attach_record_thread below does that, guarded to the same Basalith.
--   2. Health, legal trouble, and similar details were ordinary threads. t2
--      marks them `sensitive`. A sensitive thread is never pushed by a daily
--      question and never named in an email; only the owner opens it.
--   3. A thread carried no date, so a decision the owner has since reversed
--      would read as current. t2 records when it was said: first_said_at and
--      last_said_at, from the deposits' created_at.
--
-- pending_thread_extractions now also returns the deposit's created_at, which
-- changes its return type, so it is dropped and recreated. upsert_record_thread
-- gains two parameters, so the old signature is dropped too.
--
-- Applied by pasting into the Supabase SQL editor. Re-paste safe.

ALTER TABLE record_threads ADD COLUMN IF NOT EXISTS sensitive     BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE record_threads ADD COLUMN IF NOT EXISTS first_said_at TIMESTAMPTZ;
ALTER TABLE record_threads ADD COLUMN IF NOT EXISTS last_said_at  TIMESTAMPTZ;

-- ── Upsert a new thread (merge on archive + normalized label) ────────────────
DROP FUNCTION IF EXISTS upsert_record_thread(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS upsert_record_thread(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ);

CREATE FUNCTION upsert_record_thread(
  p_archive_id  UUID,
  p_kind        TEXT,
  p_label       TEXT,
  p_label_norm  TEXT,
  p_domain_hint TEXT,
  p_weight      SMALLINT,
  p_quote       TEXT,
  p_deposit_id  UUID,
  p_version     TEXT,
  p_sensitive   BOOLEAN,
  p_said_at     TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO record_threads (
    archive_id, kind, label, label_norm, domain_hint, weight, quote,
    deposit_ids, extractor_version, sensitive, first_said_at, last_said_at
  ) VALUES (
    p_archive_id, p_kind, p_label, p_label_norm, p_domain_hint, p_weight, p_quote,
    ARRAY[p_deposit_id], p_version, COALESCE(p_sensitive, FALSE), p_said_at, p_said_at
  )
  ON CONFLICT (archive_id, label_norm) DO UPDATE SET
    deposit_ids = CASE
      WHEN p_deposit_id = ANY (record_threads.deposit_ids) THEN record_threads.deposit_ids
      ELSE array_append(record_threads.deposit_ids, p_deposit_id)
    END,
    weight        = GREATEST(record_threads.weight, EXCLUDED.weight),
    domain_hint   = COALESCE(record_threads.domain_hint, EXCLUDED.domain_hint),
    sensitive     = record_threads.sensitive OR EXCLUDED.sensitive,
    first_said_at = LEAST(record_threads.first_said_at, EXCLUDED.first_said_at),
    last_said_at  = GREATEST(record_threads.last_said_at, EXCLUDED.last_said_at),
    updated_at    = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION upsert_record_thread(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_record_thread(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, TEXT, UUID, TEXT, BOOLEAN, TIMESTAMPTZ) TO service_role;

-- ── Attach a new mention to an existing thread ────────────────────────────────
-- The thread must belong to p_archive_id; a mismatched pair updates nothing and
-- returns NULL, which the caller treats as an error. The first quote is kept.
-- Status is never touched: a muted thread stays muted.
CREATE OR REPLACE FUNCTION attach_record_thread(
  p_thread_id  UUID,
  p_archive_id UUID,
  p_deposit_id UUID,
  p_weight     SMALLINT,
  p_sensitive  BOOLEAN,
  p_said_at    TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE record_threads SET
    deposit_ids = CASE
      WHEN p_deposit_id = ANY (deposit_ids) THEN deposit_ids
      ELSE array_append(deposit_ids, p_deposit_id)
    END,
    weight        = GREATEST(weight, p_weight),
    sensitive     = sensitive OR COALESCE(p_sensitive, FALSE),
    first_said_at = LEAST(first_said_at, p_said_at),
    last_said_at  = GREATEST(last_said_at, p_said_at),
    updated_at    = NOW()
  WHERE id = p_thread_id AND archive_id = p_archive_id
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION attach_record_thread(UUID, UUID, UUID, SMALLINT, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION attach_record_thread(UUID, UUID, UUID, SMALLINT, BOOLEAN, TIMESTAMPTZ) TO service_role;

-- ── Pending deposits for the sweep (now with created_at) ─────────────────────
-- Same gates as t1: active Basaliths only (lib/cronGates.test.ts pins this
-- line in this file), owner deposits only, no eval holdout, no test artifact,
-- no empty response, errored rows retried until three attempts.
DROP FUNCTION IF EXISTS pending_thread_extractions(INTEGER);

CREATE FUNCTION pending_thread_extractions(p_limit INTEGER)
RETURNS TABLE (deposit_id UUID, archive_id UUID, tier TEXT, prompt TEXT, response TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT d.id, d.archive_id, a.tier, d.prompt, d.response, d.created_at
  FROM owner_deposits d
  JOIN archives a ON a.id = d.archive_id
  LEFT JOIN record_thread_extractions x ON x.deposit_id = d.id
  WHERE a.status = 'active'
    AND d.contributor_id IS NULL
    AND d.eval_holdout IS NOT TRUE
    AND d.test_artifact IS NOT TRUE
    AND length(btrim(coalesce(d.response, ''))) > 0
    AND (x.deposit_id IS NULL OR (x.error IS NOT NULL AND x.attempts < 3))
  ORDER BY d.created_at ASC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION pending_thread_extractions(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION pending_thread_extractions(INTEGER) TO service_role;

-- ── Clear the t1 read of the Dr Ha Basalith so t2 reads it fresh ─────────────
-- These two tables carry no append-only trigger; only owner_deposits does.
-- Nothing reads threads yet, so clearing them affects no surface.
DELETE FROM record_thread_extractions WHERE archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b';
DELETE FROM record_threads            WHERE archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b';

-- ── PROVE IT (paste the output back) ──────────────────────────────────────────
--
--   -- expect: three rows, anon and authenticated false, service_role true
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute')          as anon_exec,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
--          has_function_privilege('service_role', p.oid, 'execute')  as svc_exec
--   from pg_proc p
--   where p.proname in ('upsert_record_thread','attach_record_thread','pending_thread_extractions');
--
--   -- expect: 0 and 0 (Dr Ha cleared), and a pending count of 106 or more
--   select (select count(*) from record_threads where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b') as threads,
--          (select count(*) from record_thread_extractions where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b') as ledger,
--          (select count(*) from pending_thread_extractions(1000)) as pending;
