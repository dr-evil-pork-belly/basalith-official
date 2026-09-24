-- ── Record threads: sensitive backstop and one person merge ──────────────────
-- Follows 20260924b_record_threads_t2.sql. Same day, after the first t2 read of
-- the Dr Ha Basalith (106 deposits, 66 threads, 63 mentions attached, 0 errors).
-- Record: docs/TAILORED_QUESTIONS_SLICE_1_2026-09-24.md, "t2 read and backstop".
--
-- 1. The model's `sensitive` flag missed a violence thread (neighborhood thugs),
--    three threads about the law, and a health quote. lib/threadExtract.ts now
--    backs the flag with a fixed word list (SENSITIVE_WORDS) for every new
--    thread and every non-person mention. This applies the same list, once, to
--    rows written before the backstop. lib/threadExtract.test.ts fails if the
--    list below and the list in code drift apart.
-- 2. "my wife" (7 mentions) and "Cindy" (1 mention) are one person. The model
--    cannot join a role to a name unless one answer says both. They are merged
--    here, keeping the "my wife" row's quote, weight, and sensitivity, under the
--    label "Cindy". The merge runs BEFORE the backstop so the merged row is
--    judged on the quote it keeps. An owner-facing merge is slice 4 work.
--
-- Rows only in record_threads change. owner_deposits is untouched.
-- Applied by pasting into the Supabase SQL editor. Re-paste safe: the merge
-- finds nothing the second time, and the update only ever sets true.

DO $$
DECLARE
  v_archive UUID := 'a38e4503-c7d2-4af3-af8c-cacd66974e0b';
  w record_threads;
  c record_threads;
BEGIN
  SELECT * INTO w FROM record_threads WHERE archive_id = v_archive AND label_norm = 'wife';
  SELECT * INTO c FROM record_threads WHERE archive_id = v_archive AND label_norm = 'cindy';
  IF w.id IS NOT NULL AND c.id IS NOT NULL THEN
    UPDATE record_threads SET
      deposit_ids   = ARRAY(SELECT DISTINCT x FROM unnest(w.deposit_ids || c.deposit_ids) AS x),
      weight        = GREATEST(w.weight, c.weight),
      first_said_at = LEAST(w.first_said_at, c.first_said_at),
      last_said_at  = GREATEST(w.last_said_at, c.last_said_at),
      updated_at    = NOW()
    WHERE id = w.id;
    DELETE FROM record_threads WHERE id = c.id;
    UPDATE record_threads SET label = 'Cindy', label_norm = 'cindy' WHERE id = w.id;
    RAISE NOTICE 'merged Cindy into my wife: %', w.id;
  ELSE
    RAISE NOTICE 'merge skipped: wife % cindy %', w.id, c.id;
  END IF;
END $$;

-- The backstop, all Basaliths. Whole words, any case (\m and \M are Postgres
-- word boundaries). Person threads are judged on their kept quote too.
UPDATE record_threads
SET sensitive = TRUE, updated_at = NOW()
WHERE sensitive = FALSE
  AND (quote ~* '\m(beat|beats|beaten|beating|fight|fights|fighting|fought|punch|punched|stab|stabbed|shot|gun|assault|assaulted|rob|robbed|robbery|thug|thugs|gang|violence|violent|abuse|abused|police|cop|cops|arrest|arrested|jail|prison|court|lawsuit|sued|law|illegal|crime|criminal|probation|sick|illness|hospital|doctor|surgery|cancer|disease|diagnosis|diagnosed|injury|injured|pain|dental|dentist|tooth|teeth|molar|poisoning|medication|therapy|therapist|depression|depressed|anxiety|pregnant|pregnancy|miscarriage|drunk|drug|drugs|alcohol|addict|addicted|addiction|rehab|overdose|sex|sexual|suicide|died|death|funeral)\M'
       OR label ~* '\m(beat|beats|beaten|beating|fight|fights|fighting|fought|punch|punched|stab|stabbed|shot|gun|assault|assaulted|rob|robbed|robbery|thug|thugs|gang|violence|violent|abuse|abused|police|cop|cops|arrest|arrested|jail|prison|court|lawsuit|sued|law|illegal|crime|criminal|probation|sick|illness|hospital|doctor|surgery|cancer|disease|diagnosis|diagnosed|injury|injured|pain|dental|dentist|tooth|teeth|molar|poisoning|medication|therapy|therapist|depression|depressed|anxiety|pregnant|pregnancy|miscarriage|drunk|drug|drugs|alcohol|addict|addicted|addiction|rehab|overdose|sex|sexual|suicide|died|death|funeral)\M');

-- ── PROVE IT (paste the output back) ──────────────────────────────────────────
--
--   -- expect: one Cindy row with 8 mentions, not sensitive; no "wife" row
--   select label, kind, array_length(deposit_ids, 1) as mentions, sensitive, weight
--   from record_threads
--   where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
--     and label_norm in ('cindy', 'wife');
--
--   -- expect: the sensitive list, including the thugs, the law threads, and the dental ones
--   select kind, label, weight
--   from record_threads
--   where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b' and sensitive
--   order by kind, label;
