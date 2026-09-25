# Tailored questions, slice 2: the planner on the coverage map. September 24, 2026.

Design: `docs/TAILORED_QUESTIONS_2026-09-24.md` section 4. Slice 1 (threads) is
live. This slice changes what the next question aims at. It writes no threads,
generates no text, and adds no table.

Written to disk in basalith-official by Cowork, uncommitted. No migration.

## Recon (read from the code)

1. **Succession never used the question selector.** The daily email and the
   dashboard both call `pickIncidentSeed`, which rotated eight narrative
   openers (one per business domain, `b2b_questions.is_incident_seed`,
   `category` equal to the coverage domain name) by least recent use. Coverage
   played no part.
2. **The B2C bank does not share the map's taxonomy.** `elicitation_questions`
   (104 rows) sits in ten older categories: senses 20, joy 17, work 14,
   origins 10, people 10, worldview 8, adversity 7, decisions 6, forward 6,
   values 6. The personal map has eight areas. Six categories map; senses,
   joy, and work are warm-ups about the texture of a life and map to none.
   **Risk and Money have no bank questions at all.**
3. `selectNextQuestion` aimed at deposit density (`get_domain_coverage`), the
   count the coverage map was built to replace.
4. Found, not fixed: `b2b_questions` order 21 ("How do you think about timing")
   contains an em dash. It is in the non-seed B2B bank, which no current path
   serves (succession uses the seeds), so it is not rendered today.

## Decisions (David, September 24, 2026)

1. Where the bank has nothing for an area, the area's call opener is the daily
   question.
2. The senses and joy warm-ups are for the first ten answers only.

## What changed

New
- `lib/questionPlanner.ts`: `areaNeed` (open 1.0, partial 0.6, backed 0.2;
  overreach high +0.5, some +0.25), `rankAreas` (the area asked last goes to
  the end, never dropped), `orderAreas` (optional 80/20 split, same as the
  engine's), `chooseOpener` (succession), `B2C_SLUG_TO_AREA`, `WARMUP_SLUGS`,
  and `loadAreaReadings` (latest reading in the segment's own probe set; an
  off-label reading returns nothing, same rule as the owner map).
- `lib/areaSeeds.ts`: the area call openers, moved out of `lib/areaCalls.ts`
  so the planner and `incidentSession` can use them without an import cycle.
  `areaCalls.ts` re-exports them; no importer changes.
- `lib/questionPlanner.test.ts`: 13 tests, including that every area in both
  taxonomies has an opener and that no bank slug maps to Risk or Money.

Changed
- `lib/selectNextQuestion.ts`: optional `getAreaReadings` dependency (wired in
  `defaultDeps`). B2C past p1 with a reading: walk the areas in planner order;
  serve an eligible mapped bank question (lowest density first, weight-3 rules
  judged on the whole list), else the area opener if it is off cooldown (same
  30 and 180 day cooldowns as a bank question, matched on the opener's text,
  which `question_history.question_text` already stores). An opener is
  recorded with `domain_id` and `question_id` null. No reading: the density
  path as before, minus senses and joy past p1. P0 repair, p1, and the B2B
  bank path are untouched. History now carries `question_text`.
- `lib/selectNextQuestion.test.ts`: 8 planner tests appended; every earlier
  test unchanged and passing.
- `lib/incidentSession.ts`: `pickIncidentSeed` returns `PickedSeed` (adds
  `area` and `areaCall`; `questionId` may be null). With a reading: the
  neediest domain's narrative seed if never run, else its area opener, else
  the least recent of the two, deterministic so the email and the portal
  agree. No reading: the old rotation, unchanged.
- `app/api/archive/b2b-question/next/route.ts`: an area opener opens the
  incident with the `areaCall` marker, so the map shows "Continue your call"
  and closing it requests a fresh reading, as an area call from the map does.
- `CLAUDE.md`: question planner paragraph.

Not touched: the daily cron (its calls return the new shape), the answer
route, the threads, any surface or copy.

## Verified in Cowork

- `tsc` clean on every changed file and the route (Next types stubbed).
- vitest: 115 passed, 2 skipped across questionPlanner, selectNextQuestion,
  areaCalls, incidentSession, threadExtract, cronGates.

## Run order

1. `npx tsc --noEmit 2>&1 | Select-String "error TS"` prints nothing;
   `npm test 2>&1 | Select-Object -Last 6` shows 0 failed.
2. Commit on a branch, fast-forward main, push. Backend only; behavior changes
   only for a Basalith with a coverage reading.
3. Preview on your own Basalith, no writes:
   `npx tsx scripts/preview-selection.ts --archive a38e4503-c7d2-4af3-af8c-cacd66974e0b --runs 6 --seed 7`
   Each run should aim at a thin personal area; a run aimed at Money or Risk
   prints the area opener with no domain.
4. The next succession opener, on the Founder Test Basalith: open the
   dashboard signed in there, or read `pickIncidentSeed` output in the next
   daily email. It should name the thinnest business domain.

## Next

Slice 3: the tailored writer and the question queue, behind a per-archive flag,
on the Dr Ha Basalith and MOAFly Technologies. First the MOAFly Technologies
succession Basalith has to exist, and the two CHECK constraints on
`question_history` (source, channel) need widening for tailored serves and the
dashboard card.
