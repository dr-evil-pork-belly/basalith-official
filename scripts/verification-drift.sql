-- ── Drift, derived ────────────────────────────────────────────────────────────
-- Tables: supabase/migrations/20260820_verification_surface.sql
--
-- THIS IS THE DEFINITION OF DRIFT ON THIS PROPERTY. There is no stored drift
-- integer anywhere and there must not be. Drift is what you get by diffing
-- `basis` per `probe_key` between the two passes of one run_group_id. Anyone
-- holding the rows can recompute every published figure from this file, which is
-- the entire point of the verification surface: the numbers are checkable rather
-- than asserted.
--
-- The public endpoint will run query 3. Queries 1 and 2 exist so a human can see
-- where the number came from before trusting it.
--
-- ACCEPTANCE COUPLING. scripts/coverage-fixture-probe.ts computes the same
-- quantity in memory for its own printing and for GATE 4. Query 1 must agree
-- with what the probe printed, run for run. If they disagree, persistence is not
-- faithful and nothing built on these rows can be trusted. Check that before
-- reading anything else here as true.
--
-- WHY basis AND NOT state. Drift on domain STATE is a different and much coarser
-- quantity, already gated at MAX_DOMAIN_DRIFT in the fixture probe. Probe-level
-- basis drift is the honest, larger number, and it is the one a skeptic would
-- assume was being hidden. Publishing the coarse one instead would be exactly
-- the move this surface exists to refuse.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PER RUN GROUP. One row per persona per invocation.
--    Compare against the probe's printed "probe drift: N of 48".
-- ─────────────────────────────────────────────────────────────────────────────
WITH paired AS (
  SELECT
    a.run_group_id,
    a.fixture_id,
    a.probe_set_version,
    a.probe_key,
    a.basis AS basis_pass_1,
    b.basis AS basis_pass_2
  FROM verification_probe_results a
  JOIN verification_probe_results b
    ON  b.run_group_id = a.run_group_id
    AND b.probe_key    = a.probe_key
    AND b.pass_number  = 2
  WHERE a.pass_number = 1
)
SELECT
  p.fixture_id,
  p.probe_set_version,
  p.run_group_id,
  r.published,
  r.commit_sha,
  MIN(r.started_at)                                                       AS measured_at,
  COUNT(*)                                                                AS probes_compared,
  COUNT(*) FILTER (WHERE p.basis_pass_1 IS DISTINCT FROM p.basis_pass_2)  AS probes_drifted,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE p.basis_pass_1 IS DISTINCT FROM p.basis_pass_2)
    / NULLIF(COUNT(*), 0)
  , 1)                                                                    AS drift_pct
FROM paired p
JOIN verification_runs r
  ON  r.run_group_id = p.run_group_id
  AND r.pass_number  = 1
GROUP BY p.fixture_id, p.probe_set_version, p.run_group_id, r.published, r.commit_sha
ORDER BY measured_at DESC, p.fixture_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. WHICH PROBES MOVED. The detail behind query 1, for reading a run.
--    A probe that flips every time is a probe problem, not an archive problem.
-- ─────────────────────────────────────────────────────────────────────────────
-- WITH paired AS ( ... same CTE as above ... )
-- SELECT fixture_id, run_group_id, probe_key, basis_pass_1, basis_pass_2
-- FROM paired
-- WHERE basis_pass_1 IS DISTINCT FROM basis_pass_2
-- ORDER BY fixture_id, probe_key;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. THE PUBLISHED WINDOW. What the public endpoint reports.
--
--    published = TRUE only. A manual or local run writes rows with published
--    FALSE and therefore cannot move this number, which is what stops someone
--    running the probe on a laptop from changing a public figure.
--
--    Probes are pooled across groups rather than averaging per-group
--    percentages. Averaging an average weights a run with fewer comparable
--    probes equally with a full one, which would let a short run distort the
--    headline. Summing numerators and denominators does not.
-- ─────────────────────────────────────────────────────────────────────────────
WITH paired AS (
  SELECT
    a.run_group_id,
    a.probe_set_version,
    a.probe_key,
    a.basis AS basis_pass_1,
    b.basis AS basis_pass_2
  FROM verification_probe_results a
  JOIN verification_probe_results b
    ON  b.run_group_id = a.run_group_id
    AND b.probe_key    = a.probe_key
    AND b.pass_number  = 2
  WHERE a.pass_number = 1
),
published_groups AS (
  SELECT DISTINCT run_group_id, probe_set_version
  FROM verification_runs
  WHERE published = TRUE
    AND ok = TRUE
    AND complete = TRUE
)
SELECT
  g.probe_set_version,
  COUNT(DISTINCT p.run_group_id)                                          AS run_groups,
  COUNT(*)                                                                AS probes_compared,
  COUNT(*) FILTER (WHERE p.basis_pass_1 IS DISTINCT FROM p.basis_pass_2)  AS probes_drifted,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE p.basis_pass_1 IS DISTINCT FROM p.basis_pass_2)
    / NULLIF(COUNT(*), 0)
  , 1)                                                                    AS drift_pct
FROM paired p
JOIN published_groups g ON g.run_group_id = p.run_group_id
GROUP BY g.probe_set_version
ORDER BY g.probe_set_version;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROW CENSUS. Cheap sanity check on any invocation.
--    A full fixture invocation writes 4 run rows and 192 probe rows:
--    2 personas x 2 passes, 48 probes each at probe set v2.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM verification_runs)                          AS runs_total,
  (SELECT COUNT(*) FROM verification_probe_results)                 AS probe_rows_total,
  (SELECT COUNT(*) FROM verification_runs WHERE published)          AS runs_published,
  (SELECT COUNT(DISTINCT run_group_id) FROM verification_runs)      AS run_groups;
