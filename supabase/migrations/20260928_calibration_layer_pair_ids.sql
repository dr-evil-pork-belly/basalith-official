-- Calibration slice 1. Which training pairs sat in the frozen layer for
-- this probe when the model answered it. Null on every row written
-- before this migration; those runs cannot be reviewed for provenance.
--
-- No FK on the array elements. training_pairs rows are never deleted except
-- by cascade from archives, and coverage_probe_results cascades from the same
-- parent, so a dangling id cannot occur. Nullable on purpose: null means
-- "written before provenance existed," and slice 2 must treat null as "cannot
-- show the source," never as "no source." An empty layer writes '{}'.
--
-- No new grants. The table's RLS and service-role policy cover a new column.
-- Pasted by hand in the Supabase SQL editor. Never supabase db push.
alter table coverage_probe_results
  add column if not exists layer_pair_ids uuid[];

-- PROVE IT (run after the first manual coverage run on a38e4503)
-- select p.probe_key, p.basis, cardinality(p.layer_pair_ids) as pairs
-- from coverage_probe_results p
-- join coverage_runs r on r.id = p.run_id
-- where r.archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
--   and r.id = (select id from coverage_runs
--               where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
--               order by finished_at desc nulls last limit 1)
-- order by p.domain, p.probe_key;
