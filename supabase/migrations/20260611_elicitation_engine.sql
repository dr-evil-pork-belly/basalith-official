-- Elicitation engine: question bank, serve history, and domain weighting
-- used by lib/selectNextQuestion.ts.
--
-- ⚠ DOCUMENTATION ONLY -- DO NOT RUN VIA SUPABASE CLI / MIGRATION RUNNER.
--
-- Every table below already exists in production with this exact shape
-- (confirmed against information_schema on 2026-06-11). This file is kept
-- as a readable record of that ground truth so future changes to
-- lib/selectNextQuestion.ts can be checked against it without a live query.
--
-- The only two statements that are NOT yet applied are marked "PENDING"
-- at the bottom of this file -- those are the actual delta to paste into
-- the SQL editor.

-- ── cognitive_domains ───────────────────────────────────────────────────────
-- id               integer    PK (nextval cognitive_domains_id_seq)
-- scope            text       not null            ('b2c' | 'b2b')
-- slug             text       not null
-- name             text       not null
-- description      text       not null
-- emotional_weight integer    not null default 1  (1 | 2 | 3)

-- ── deposit_domain_scores ───────────────────────────────────────────────────
-- id          bigint        PK (nextval deposit_domain_scores_id_seq)
-- deposit_id  uuid          not null
-- archive_id  uuid          not null
-- domain_id   integer       not null  -> cognitive_domains.id
-- weight      numeric       not null
-- depth       integer       not null
-- created_at  timestamptz   not null default now()

-- ── elicitation_questions: b2c question bank ────────────────────────────────
-- id          bigint        PK (nextval elicitation_questions_id_seq)
-- scope       text          not null default 'b2c'
-- domain_id   integer       not null  -> cognitive_domains.id
-- tier        text          not null  ('onramp' | 'standard' | 'deep')
-- text        text          not null  -- NOTE: column is "text", not "question_text"
-- active      boolean       not null default true
-- created_at  timestamptz   not null default now()
--
-- selectNextQuestion only serves rows where scope = 'b2c' AND active = true.

-- ── b2b_questions: succession-tier question bank ────────────────────────────
-- id          uuid          PK default gen_random_uuid()
-- category    text          not null
-- question    text          not null
-- description text
-- order_index integer       default 0
-- created_at  timestamptz   default now()
-- domain_id   integer       -> cognitive_domains.id (nullable)

-- ── question_history: every question served to an archive ──────────────────
-- id                  bigint       PK (nextval question_history_id_seq)
-- archive_id          uuid         not null  -> archives.id
-- question_id         bigint       nullable  -> elicitation_questions.id
-- b2b_question_id     uuid         nullable  -> b2b_questions.id
-- domain_id           integer      nullable  -> cognitive_domains.id
-- question_text       text         not null
-- framing_used        boolean      not null default false
-- channel             text         not null  -- check: 'daily_email' | 'mirror_thread' | 'app_companion' | 'app_spark'
-- served_at           timestamptz  not null default now()
-- answered_deposit_id uuid         nullable  -- set later by the reply handler, never by selectNextQuestion
-- answered_at         timestamptz  nullable  -- set later by the reply handler, never by selectNextQuestion
--
-- selectNextQuestion writes: archive_id, domain_id, question_id, b2b_question_id,
-- question_text, source, channel, framing_used (as a boolean -- true iff a
-- grounded framing sentence was prepended). It never writes
-- answered_deposit_id or answered_at.

-- ── get_domain_coverage: live coverage stats per archive + scope ────────────
-- Already exists, but was defined against assumed UUID/SMALLINT types.
-- Re-created below (PENDING) against the real INTEGER domain_id /
-- emotional_weight types.


-- =============================================================================
-- PENDING -- the only two statements not yet applied. Paste these as-is.
-- =============================================================================

-- 1. question_history.source does not exist yet. Add it (idempotent).
ALTER TABLE question_history
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('p0', 'p1', 'p2', 'p3'));

-- 2. Re-create get_domain_coverage against the real INTEGER domain id /
--    emotional_weight types (CREATE OR REPLACE is idempotent).
CREATE OR REPLACE FUNCTION get_domain_coverage(p_archive_id UUID, p_scope TEXT)
RETURNS TABLE (
  domain_id        INTEGER,
  slug             TEXT,
  emotional_weight INTEGER,
  density          NUMERIC,
  avg_depth        NUMERIC,
  last_touched     TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
  SELECT
    cd.id,
    cd.slug,
    cd.emotional_weight,
    COALESCE(SUM(dds.weight * dds.depth), 0)::NUMERIC AS density,
    COALESCE(AVG(dds.depth), 0)::NUMERIC              AS avg_depth,
    MAX(dds.created_at)                               AS last_touched
  FROM cognitive_domains cd
  LEFT JOIN deposit_domain_scores dds
    ON dds.domain_id = cd.id AND dds.archive_id = p_archive_id
  WHERE cd.scope = p_scope
  GROUP BY cd.id, cd.slug, cd.emotional_weight;
$$;
