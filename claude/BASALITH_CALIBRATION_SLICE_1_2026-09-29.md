# Calibration slice 1: layer provenance, store only

Built September 28 and 29, 2026 on branch `calibration-2026-09-28`. Commit
`3be8b26`, fast-forwarded to main and deployed to production by that push.

## What changed

One column and one write. Nothing reads the column.

- Migration `supabase/migrations/20260928_calibration_layer_pair_ids.sql` adds
  `coverage_probe_results.layer_pair_ids uuid[]`, nullable, no FK on the
  elements, no new grants. David pasted it in the SQL editor. Confirmed live:
  `layer_pair_ids | ARRAY`.
- `supabaseCoverageStore.recordProbe` (`lib/coverageRun.ts`) writes
  `layer_pair_ids` on every probe row, whatever the basis.
- The ids come from `selection.pairs`, the layer `selectFrozenLayer` already
  built for that probe, in the order it was placed. No second selection, no
  re-query, no model call. The ids were never dropped: `composeFrozenLayer`
  returns the candidate objects themselves, and the archive read already
  selected `id`.
- `ProbeRecord` gained a required `layerPairIds: string[]`. Injected fixtures
  carry no ids, so their layers record as empty; they write to the
  verification tables, which do not store this.

Meaning of the column:

- An array of ids: the pairs the model had in front of it for that probe.
- `'{}'`: an empty layer.
- `null`: a row written before provenance existed. Slice 2 must treat null as
  "cannot show the source," never as "no source."

## Tests

All in `lib/coverageRun.test.ts`, the store neutrality file.

- Prompt neutrality. sha256 of all 48 voice system prompts, taken from HEAD
  `777e110` before the change, pinned for both segments
  (succession `065a776c...`, b2c `14195caa...`). Both match after the change.
  The same test asserts all 48 rows carry the ids of the selected pairs.
- Order. Over the cap, the ids come out in layer order, retriever pick
  included.
- Empty selection. The fixture path records `[]` and the Supabase row writes
  `layer_pair_ids: []`.
- Boundary, permanent. `layer_pair_ids` and `layerPairIds` must never appear in
  `lib/frozenLayer.ts`, `lib/entitySystemPrompt.ts`, `lib/verifyGrounding.ts`,
  `lib/entityContext.ts`, `lib/foundingProof.ts`, `lib/familyEntity.ts`, or
  either chat route. Provenance recording never becomes an input.
- The existing key-set pin on the probe row now includes `layer_pair_ids`.
- Three fixtures in `lib/verificationStore.test.ts` gained `layerPairIds: []`.

Gates: `npx tsc --noEmit` printed no errors, including none of the five
`lib/frozenLayer.test.ts` errors the brief expected. `npm test`: 42 files,
754 passed, 2 skipped.

## Live proof, a38e4503

Runs on the Dr Ha Basalith, from the PROVE IT query and a per-run count:

| run        | finished (UTC)      | rows | with ids | backed |
| ---------- | ------------------- | ---- | -------- | ------ |
| `170b1530` | 2026-09-29 17:23:34 | 48   | 48       | 24     |
| `708cbe22` | 2026-09-29 17:09:08 | 48   | 15       | 26     |
| `da1868bc` | 2026-09-22 23:36:47 | 48   | 0        | 26     |
| `f71d7a6f` | 2026-09-22 23:30:03 | 48   | 0        | 13     |

On `170b1530`, every row has a count of 20: 24 deposit, 22 no_position,
2 unsupported (`p-adversity-05`, `p-money-03`). Twenty is `FROZEN_LAYER_LIMIT`,
which is what an archive over the cap should show. The September 22 rows stay
null, as expected.

## Finding: a run can straddle a deploy

`708cbe22` was requested around the deploy and has 15 rows with ids and 33
without. Every probe is its own Inngest step, and each step is served by
whichever deployment Inngest is pointed at when that step runs. So one run can
execute partly on the old code and partly on the new. That is the likely
mechanism and it fits the split; it was not traced step by step.

Consequences:

- `708cbe22` has mixed provenance. Its 33 null rows look exactly like
  pre-migration rows. That is correct under the null rule: the source cannot be
  shown. Leave the run as it is. Do not backfill or delete it.
- The same thing can happen to any change that alters what a run writes or
  how it measures, not only this one.

**Rule: do not request a coverage run until the Inngest app page shows the
deployed commit.** A green Vercel deploy and a 200 from `/api/inngest` do not
prove the sync landed (CLAUDE.md section 6). The commit on the app page does.

## Decision: a38e4503 is admitted by allowlist, not by tier

David decided that the Dr Ha Basalith (`a38e4503`) enters calibration by an
explicit allowlist, not by changing its tier. Its tier stays `active`. Nothing
in this slice implements an allowlist. Whatever surface slice 2 builds must
gate on the allowlist and must not read `tier` to decide who is in
calibration.

## UNVERIFIED

- Column live. CONFIRMED: `layer_pair_ids | ARRAY`.
- Array write into `uuid[]` through PostgREST. CONFIRMED: `170b1530`, 48 of 48
  rows with ids.
- Prior rows stay null. CONFIRMED: `da1868bc` and `f71d7a6f`, 0 of 48 each.
- Production deploy. CONFIRMED: `origin/main` at `3be8b26`,
  `curl -sI https://basalith.ai/archive-login` returned `HTTP/1.1 200 OK`.
- Live `training_pairs.id` data type. NOT CONFIRMED. The pasted result was a
  placeholder. The migration file says `UUID`, and the live write succeeded,
  which makes this moot for writing. Confirm with `select data_type from
  information_schema.columns where table_name = 'training_pairs' and
  column_name = 'id';`
- That the listed ids are real `training_pairs` rows on a38e4503. NOT
  CONFIRMED. The query counted ids and did not join them. Confirm by
  unnesting `layer_pair_ids` on `170b1530` and joining to `training_pairs` on
  `id` and `archive_id`. Every id should match.
- Inngest app page showing `3be8b26`. NOT CONFIRMED in this session. The
  second run's 48 of 48 implies the sync landed. Confirm on the app page.
- How the September 22 runs were requested. NOT CONFIRMED. No doc records it.
  The September 15 and 16 runs were sent from the dashboard's Send event form.
- The step-level mechanism behind `708cbe22`. NOT CONFIRMED. See the finding
  above. Confirm by reading that run's step timeline in the Inngest dashboard
  against the deploy time.
- The allowlist. NOT BUILT. It is recorded here as a decision only.
