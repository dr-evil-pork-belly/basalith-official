# Incident-interview pairs and the frozen layer. September 16, 2026.

Found while sizing the family entity move (`docs/FAMILY_ENTITY_MOVE_2026-09-16.md`).

## What was found, in order

1. The Dr Ha archive showed 122 deposits on the dashboard and 66 with
   `test_artifact` excluded. All 56 flagged rows were `web_capture`, July 1 to
   September 15: the July CDM drive turns and the three founding calls.
2. No trigger, rule, function, default, or scheduled job sets that flag, and
   nothing in the code writes it. The founding rows were flagged by a hand-run
   update at some point after September 13. Origin unknown; recorded so nobody
   spends another hour looking for a mechanism.
3. The July rows are fiction (Marcus at Vantage, Priya, a CFO, a winter
   payroll). CLAUDE.md section 6's open question, "may be real founder
   content," closes as no. They stay flagged. Their 18 training pairs were all
   already excluded by score.
4. The founder unflagged the 38 founding rows on September 16. The family
   entity on the `context` route reads them from that moment; it never had.
5. 37 of the 38 founding deposits have a training pair. The scorer excluded
   31 of them: average 39, range 18 to 49, bar 50. The 6 included scored 50
   to 61.

## Why the scorer rejects interview turns

`scoreTrainingPair` was written for open deposits and says so: under 20
words caps specificity at 3, length under 20 words scores 3 of 10, "most
pairs should score 3 to 7." Incident probes are built to draw short precise
answers ("What finally tipped it?"), and the reducer already re-probes a thin
spine answer once and accepts the rest. Two gates, the second built for other
material, and the second threw away five of six turns the first accepted. Every
founding call on every archive would have gone the same way.

## What changed

`lib/trainingPipeline.ts`
- `includeInTraining(score, probeType)`: an incident-interview pair
  (metadata carries `probe_type`) is included on the interview's say-so.
  Score recorded, not consulted. Open deposits unchanged at 50.
- Test artifact guard: `createTrainingPairFromDeposit` reads the deposit's
  `test_artifact` when an id is given and refuses a flagged one. Before this,
  fiction reached `training_pairs` and stayed out of the layer only because the
  scorer happened to reject it.
- Two em dashes removed from log strings, one from the header.

`supabase/migrations/20260916_include_incident_pairs.sql`: data only. Includes
every existing interview pair whose source deposit is not a test artifact, and
excludes every pair whose source deposit is. Founder pastes after the deploy.

`lib/trainingPipeline.test.ts`: 2 tests.

## Not changed, on purpose

The scorer rubric. A rubric change moves every open deposit on every archive
and is its own cycle. The right next step is not a better score for a
fragment; it is a pair that is not a fragment. See below.

## Next: self-contained incident pairs

A founding pair today reads "Q: What finally tipped it? A: The runway math
against the churn risk." Without the incident it belongs to, that means little
to the entity and could mislead the auditor, which matches a position to a
deposit on that question. The proper shape is a prompt that carries the
incident anchor from `incident_sessions.state` (the seed and the branch the
probe was on), so the pair stands alone for both the voice and the verifier.
That is: `createTrainingPairFromDeposit` takes an incident context the answer
route already has in hand; a backfill rewrites the 37 founding prompts from
the session state they came from; the scorer, if it is ever consulted on
these again, sees a real pair. Its own slice.

## After the deploy and the paste

Read the Dr Ha coverage map again, because yesterday's reading was taken on a
layer holding 6 of the 37 founding pairs. Inngest, Events, Send event:

    {"name":"coverage.run.requested",
     "data":{"archiveId":"a38e4503-c7d2-4af3-af8c-cacd66974e0b","triggerSource":"manual"}}

Then the two queries from `docs/PERSONAL_COVERAGE_MAP_2026-09-15.md` and the
dashboard. Expect the counts to move; the previous reading is in that runbook
for the comparison.
