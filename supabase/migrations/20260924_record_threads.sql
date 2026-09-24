-- ── Record threads: slice 1 of tailored questions ────────────────────────────
-- Spec: docs/TAILORED_QUESTIONS_2026-09-24.md (project copy:
-- claude/BASALITH_TAILORED_QUESTIONS_2026-09-24.md), sections 3.2 and 7.
--
-- A thread is something an owner named in a deposit that could carry a
-- decision: a person, a project, an event, a place, a recurring call, a chapter
-- of life, an arena (a craft, a sport, a community). Threads exist to STEER
-- QUESTIONS. They are never evidence. Nothing in the entity prompt, the frozen
-- layer, the verifier, the saturation check, or the founding proof may read this
-- table. lib/threadExtract.test.ts pins that on the source text.
--
-- Slice 1 is write-only. Threads are extracted and stored; nothing serves them.
--
-- Write path: lib/inngest/threadFunctions.ts (hourly sweep) and
-- scripts/backfill-threads.ts, both through lib/threadExtract.ts and the two
-- RPCs below. Service role only.
--
-- deposit_ids is uuid[] with no foreign key. That is safe here because
-- owner_deposits is append only (20260921, 20260922): a deposit only ever
-- disappears when its whole Basalith is deleted, and every row in this file
-- cascades from archives in that same statement.
--
-- Applied by pasting into the Supabase SQL editor. Re-paste safe.

-- ── Threads ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS record_threads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id     UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  kind           TEXT        NOT NULL
    CHECK (kind IN ('person','project','event','place','recurring_decision','chapter','arena')),
  label          TEXT        NOT NULL,
  label_norm     TEXT        NOT NULL,
  domain_hint    TEXT,
  weight         SMALLINT    NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 3),
  quote          TEXT        NOT NULL,
  deposit_ids    UUID[]      NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','explored','exhausted','muted')),
  times_asked    INTEGER     NOT NULL DEFAULT 0,
  last_asked_at  TIMESTAMPTZ,
  extractor_version TEXT     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS record_threads_dedupe
  ON record_threads (archive_id, label_norm);

ALTER TABLE record_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON record_threads;
CREATE POLICY "service_role_full_access" ON record_threads
  TO service_role USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON record_threads FROM anon, authenticated;

-- ── Extraction ledger ─────────────────────────────────────────────────────────
-- One row per owner deposit the extractor has looked at, success or failure.
-- This is what makes the sweep idempotent and lets it catch every capture
-- channel without touching a single deposit route: a deposit with no ledger row
-- is pending, whatever route wrote it. A failed attempt is retried on the next
-- sweep until three attempts, then left for a person to look at.
CREATE TABLE IF NOT EXISTS record_thread_extractions (
  deposit_id        UUID        PRIMARY KEY REFERENCES owner_deposits(id) ON DELETE CASCADE,
  archive_id        UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  extractor_version TEXT        NOT NULL,
  threads_found     INTEGER,
  error             TEXT,
  attempts          INTEGER     NOT NULL DEFAULT 1,
  extracted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS record_thread_extractions_archive_idx
  ON record_thread_extractions (archive_id);

ALTER TABLE record_thread_extractions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON record_thread_extractions;
CREATE POLICY "service_role_full_access" ON record_thread_extractions
  TO service_role USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON record_thread_extractions FROM anon, authenticated;

-- ── Upsert one thread (atomic merge on archive + normalized label) ───────────
-- A second mention of the same thread appends the deposit id, keeps the first
-- quote, keeps the heavier weight, and fills a missing domain hint. Status is
-- never touched here: a muted thread stays muted however often it is mentioned.
CREATE OR REPLACE FUNCTION upsert_record_thread(
  p_archive_id  UUID,
  p_kind        TEXT,
  p_label       TEXT,
  p_label_norm  TEXT,
  p_domain_hint TEXT,
  p_weight      SMALLINT,
  p_quote       TEXT,
  p_deposit_id  UUID,
  p_version     TEXT
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO record_threads (
    archive_id, kind, label, label_norm, domain_hint, weight, quote,
    deposit_ids, extractor_version
  ) VALUES (
    p_archive_id, p_kind, p_label, p_label_norm, p_domain_hint, p_weight, p_quote,
    ARRAY[p_deposit_id], p_version
  )
  ON CONFLICT (archive_id, label_norm) DO UPDATE SET
    deposit_ids = CASE
      WHEN p_deposit_id = ANY (record_threads.deposit_ids) THEN record_threads.deposit_ids
      ELSE array_append(record_threads.deposit_ids, p_deposit_id)
    END,
    weight      = GREATEST(record_threads.weight, EXCLUDED.weight),
    domain_hint = COALESCE(record_threads.domain_hint, EXCLUDED.domain_hint),
    updated_at  = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION upsert_record_thread(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_record_thread(UUID, TEXT, TEXT, TEXT, TEXT, SMALLINT, TEXT, UUID, TEXT) TO service_role;

-- ── Record one extraction attempt ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_thread_extraction(
  p_deposit_id    UUID,
  p_archive_id    UUID,
  p_version       TEXT,
  p_threads_found INTEGER,
  p_error         TEXT
) RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO record_thread_extractions (deposit_id, archive_id, extractor_version, threads_found, error)
  VALUES (p_deposit_id, p_archive_id, p_version, p_threads_found, p_error)
  ON CONFLICT (deposit_id) DO UPDATE SET
    extractor_version = EXCLUDED.extractor_version,
    threads_found     = EXCLUDED.threads_found,
    error             = EXCLUDED.error,
    attempts          = record_thread_extractions.attempts + 1,
    extracted_at      = NOW();
END;
$$;

REVOKE ALL ON FUNCTION record_thread_extraction(UUID, UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_thread_extraction(UUID, UUID, TEXT, INTEGER, TEXT) TO service_role;

-- ── Pending deposits for the sweep ────────────────────────────────────────────
-- Owner deposits only (contributor text never creates threads in v1), never an
-- eval holdout (a thread would steer questions toward held-out content and
-- inflate the fidelity eval), never a test artifact, never empty. Active
-- Basaliths only, the same gate every cron carries (lib/cronGates.test.ts pins
-- this line). Oldest first.
CREATE OR REPLACE FUNCTION pending_thread_extractions(p_limit INTEGER)
RETURNS TABLE (deposit_id UUID, archive_id UUID, tier TEXT, prompt TEXT, response TEXT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT d.id, d.archive_id, a.tier, d.prompt, d.response
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

-- ── PROVE IT (paste the output back) ──────────────────────────────────────────
--
--   -- expect: two tables, rls on, no anon or authenticated grants
--   select c.relname, c.relrowsecurity,
--          has_table_privilege('anon', c.oid, 'select')          as anon_select,
--          has_table_privilege('authenticated', c.oid, 'select') as auth_select
--   from pg_class c
--   where c.relname in ('record_threads','record_thread_extractions');
--
--   -- expect: three functions, anon and authenticated cannot execute
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute')          as anon_exec,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
--   from pg_proc p
--   where p.proname in ('upsert_record_thread','record_thread_extraction','pending_thread_extractions');
--
--   -- expect: a count, not an error (proves the eval_holdout and test_artifact
--   -- columns resolve as booleans)
--   select count(*) from pending_thread_extractions(1000);
