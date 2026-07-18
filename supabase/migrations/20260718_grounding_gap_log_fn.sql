-- ── Grounding gap log function ────────────────────────────────────────────────
-- Atomic upsert-increment for grounding_gaps (see 20260717_grounding_gaps.sql).
-- Called by lib/groundingGapLog.ts via supabaseAdmin.rpc('log_grounding_gap').
--
-- First sighting of an (archive_id, question_hash) inserts the row with the
-- given basis. A repeat increments hit_count, bumps last_seen_at, and LEAVES
-- basis and question untouched (first classification wins; the first verbatim
-- question is kept). PostgREST's upsert cannot express "hit_count + 1", so the
-- increment lives here as a single atomic statement.
--
-- Locked to service_role: only the production route (service key) calls it.
-- Applied by pasting into the Supabase SQL editor; recorded here for history.

CREATE OR REPLACE FUNCTION log_grounding_gap(
  p_archive_id    UUID,
  p_question      TEXT,
  p_question_hash TEXT,
  p_basis         TEXT
) RETURNS VOID
LANGUAGE sql
AS $$
  INSERT INTO grounding_gaps (archive_id, question, question_hash, basis)
  VALUES (p_archive_id, p_question, p_question_hash, p_basis)
  ON CONFLICT (archive_id, question_hash)
  DO UPDATE SET
    hit_count    = grounding_gaps.hit_count + 1,
    last_seen_at = NOW();
$$;

-- Functions default to PUBLIC execute; close that, then grant only to
-- service_role (the production route's key). No anon/authenticated access.
REVOKE EXECUTE ON FUNCTION log_grounding_gap(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION log_grounding_gap(UUID, TEXT, TEXT, TEXT) TO service_role;
