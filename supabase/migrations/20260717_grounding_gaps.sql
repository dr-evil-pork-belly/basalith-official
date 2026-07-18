-- ── Grounding gaps table ──────────────────────────────────────────────────────
-- Slice A of the grounding gap queue (spec: BASALITH_GAP_QUEUE_SKELETON.md).
--
-- Logs succession-entity questions the frozen archive cannot ground, as judged
-- by the output-side grounding verifier (lib/verifyGrounding.ts). A row is
-- written whenever the verifier basis is NOT 'deposit':
--   'unsupported'  the draft overreached; the reply is replaced with the
--                  templated honest gap (groundingGapReply).
--   'no_position'  the entity declined or hedged in its own words; the reply is
--                  NOT replaced. This row is expected and intended.
-- basis='deposit' (a grounded answer) never writes.
--
-- Write path: app/api/succession/entity/chat/route.ts ONLY, via
-- lib/groundingGapLog.ts. The public demo route must never write here.
--
-- Applied by pasting into the Supabase SQL editor; this repo does not run
-- migrations from CI/sandbox. Recorded here for the repo history. Identical
-- DDL to the Phase 2 paste block.

CREATE TABLE IF NOT EXISTS grounding_gaps (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id          UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  question            TEXT        NOT NULL,
  question_hash       TEXT        NOT NULL,
  basis               TEXT        NOT NULL
    CHECK (basis IN ('unsupported','no_position')),
  hit_count           INTEGER     NOT NULL DEFAULT 1,
  status              TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','served','answered','dismissed')),
  served_at           TIMESTAMPTZ,
  answered_deposit_id UUID,
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exact-ish dedupe: one row per (archive, normalized question). The write path
-- upserts on this index, incrementing hit_count instead of inserting a twin.
CREATE UNIQUE INDEX IF NOT EXISTS grounding_gaps_dedupe
  ON grounding_gaps (archive_id, question_hash);

-- Service-role-only RLS, mirrored from 20260502_training_pipeline.sql:34-36.
ALTER TABLE grounding_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON grounding_gaps
  TO service_role USING (TRUE) WITH CHECK (TRUE);
