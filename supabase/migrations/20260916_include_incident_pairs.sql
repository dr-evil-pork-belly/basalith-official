-- ── Include incident-interview pairs already written ──────────────────────────
-- Data change, not schema. Paste in the Supabase SQL editor after the deploy
-- that carries includeInTraining in lib/trainingPipeline.ts, so new and old
-- pairs follow the same rule.
--
-- WHY. The scorer in lib/trainingPipeline.ts was written for standalone
-- paragraphs. Incident-interview turns are short by design and the reducer has
-- already accepted them. On the first live Founding Sequence (Dr Ha, September
-- 14 and 15, 2026) it rejected 31 of 37 founding turns. From this deploy on, a
-- pair whose metadata carries a probe_type is included when created. This
-- statement brings the pairs written before that in line.
--
-- Guard: never include a pair whose source deposit is a test artifact, whatever
-- its probe_type. The fictional CDM drive turns from July 2026 carry probe
-- types too.

update training_pairs tp
set included_in_training = true
from owner_deposits d
where d.id = tp.source_id
  and tp.metadata ? 'probe_type'
  and tp.included_in_training = false
  and d.test_artifact is not true;

-- Belt and braces, across every archive: nothing sourced from a test artifact
-- stays included, whatever the score.
update training_pairs tp
set included_in_training = false
from owner_deposits d
where d.id = tp.source_id
  and d.test_artifact = true
  and tp.included_in_training = true;

-- Confirm. Expected on the Dr Ha archive: 37 included founding pairs, 0
-- included test-artifact pairs.
--   select tp.included_in_training, count(*)
--   from training_pairs tp join owner_deposits d on d.id = tp.source_id
--   where d.archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
--     and d.created_at >= '2026-09-14'
--   group by 1;
--
--   select count(*) as included_test_artifact_pairs
--   from training_pairs tp join owner_deposits d on d.id = tp.source_id
--   where d.test_artifact = true and tp.included_in_training = true;
