-- ── Coverage map ──────────────────────────────────────────────────────────────
-- Spec: BASALITH_COVERAGE_MAP_SKELETON.md.
--
-- Replaces deposit count as the progress signal with a per-domain map of where a
-- successor would still be guessing. Coverage is MEASURED: a domain is 'backed'
-- because the succession entity was asked a position-forcing probe and
-- lib/verifyGrounding.ts returned basis='deposit'. It is never derived from a
-- deposit count. Nothing in this schema stores a score or a percentage, and
-- there is deliberately no archive-level rollup column anywhere.
--
-- Write path: lib/inngest/coverageFunctions.ts ONLY. The public demo route must
-- never write here; the fixture probe (scripts/coverage-fixture-probe.ts) runs
-- entirely in memory against lib/demoPersonas and writes nothing.
--
-- Applied by pasting into the Supabase SQL editor; this repo does not run
-- migrations from CI/sandbox. Recorded here for the repo history.
--
-- Idempotency note: policies use DROP ... IF EXISTS before CREATE rather than
-- the bare CREATE POLICY in 20260502_training_pipeline.sql:35, so a re-paste is
-- a no-op instead of an error. The policy body is identical.

-- ── Runs ──────────────────────────────────────────────────────────────────────
-- One row per computation. The run is the unit of comparability: a result under
-- one probe_set_version is not comparable to a result under another, so the
-- version is stamped here and on every current-state row.
CREATE TABLE IF NOT EXISTS coverage_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id        UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  probe_set_version TEXT        NOT NULL,
  segment           TEXT,
  -- Set when the probe set does not match the archive's segment. The only
  -- current case is running the b2b probe set against a b2c archive to get a
  -- real-archive read before any succession archive exists. Labeled, never
  -- shown outside /god.
  off_label         BOOLEAN     NOT NULL DEFAULT FALSE,
  trigger_source    TEXT        NOT NULL DEFAULT 'manual'
    CHECK (trigger_source IN ('manual','cron','transition')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  ok                BOOLEAN,
  complete          BOOLEAN,
  error             TEXT,
  probes_total      INTEGER,
  probes_deposit    INTEGER,
  model_calls       INTEGER
);

CREATE INDEX IF NOT EXISTS coverage_runs_archive_idx
  ON coverage_runs (archive_id, started_at DESC);

-- At most one run in flight per archive. This is the idempotency backstop behind
-- the explicit in-flight check in the Inngest handler: a duplicate
-- coverage.run.requested cannot open a second concurrent run.
CREATE UNIQUE INDEX IF NOT EXISTS coverage_runs_one_in_flight
  ON coverage_runs (archive_id) WHERE finished_at IS NULL;

ALTER TABLE coverage_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON coverage_runs;
CREATE POLICY "service_role_full_access" ON coverage_runs
  TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ── Probe results ─────────────────────────────────────────────────────────────
-- Per-probe detail. This is what makes a gap explainable to a founder rather
-- than asserted at them, which is the whole product value of the map.
--
-- reply holds the entity's draft answer. It is stored on purpose: when a founder
-- asks why a domain reads open, the answer is the transcript, not a number.
CREATE TABLE IF NOT EXISTS coverage_probe_results (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID        NOT NULL REFERENCES coverage_runs(id) ON DELETE CASCADE,
  domain     TEXT        NOT NULL,
  probe_key  TEXT        NOT NULL,
  basis      TEXT        NOT NULL
    CHECK (basis IN ('deposit','no_position','unsupported')),
  topic      TEXT,
  reply      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One result per probe per run. A retried step upserts rather than twinning.
CREATE UNIQUE INDEX IF NOT EXISTS coverage_probe_results_run_probe
  ON coverage_probe_results (run_id, probe_key);
CREATE INDEX IF NOT EXISTS coverage_probe_results_run_domain_idx
  ON coverage_probe_results (run_id, domain);

ALTER TABLE coverage_probe_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON coverage_probe_results;
CREATE POLICY "service_role_full_access" ON coverage_probe_results
  TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ── Current state ─────────────────────────────────────────────────────────────
-- What any surface reads. state is derived and stored anyway: the UI must never
-- recompute it, because recomputing means 48 model calls on a dashboard render.
-- A stale row beats a live model call.
--
-- damped records that hysteresis held this domain above what the last run alone
-- would have given it, so a reviewer can tell a steady domain from one that is
-- one weak run away from falling.
CREATE TABLE IF NOT EXISTS archive_coverage (
  archive_id        UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
  domain            TEXT        NOT NULL,
  state             TEXT        NOT NULL
    CHECK (state IN ('backed','partial','open')),
  probes_deposit    INTEGER     NOT NULL,
  probes_total      INTEGER     NOT NULL,
  damped            BOOLEAN     NOT NULL DEFAULT FALSE,
  probe_set_version TEXT        NOT NULL,
  last_run_id       UUID        REFERENCES coverage_runs(id) ON DELETE SET NULL,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archive_id, domain)
);

ALTER TABLE archive_coverage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON archive_coverage;
CREATE POLICY "service_role_full_access" ON archive_coverage
  TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ── Column comments ───────────────────────────────────────────────────────────
COMMENT ON TABLE  coverage_runs IS
  'One coverage computation. Coverage is measured by probing the entity and reading the grounding verifier, never derived from deposit counts.';
COMMENT ON COLUMN coverage_runs.off_label IS
  'TRUE when the probe set does not match the archive segment (for example the b2b set run against a b2c archive). Such a run is diagnostic only and must not be shown to a customer.';
COMMENT ON COLUMN coverage_runs.complete IS
  'TRUE when every live domain received its full probe set. An incomplete run is still written, because a partial map beats no map, but an open domain from a short run is a weaker claim than one from a full run.';
COMMENT ON COLUMN archive_coverage.state IS
  'backed = every probe in the domain returned basis=deposit. partial = some did. open = none did. Never a score, never a percentage.';
COMMENT ON COLUMN archive_coverage.damped IS
  'TRUE when hysteresis held this domain above the raw state of the last run. Downward moves are damped one step because the verifier is not deterministic.';
