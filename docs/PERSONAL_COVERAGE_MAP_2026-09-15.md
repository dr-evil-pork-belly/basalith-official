# The personal coverage map, and the end of the accuracy score. September 15, 2026.

Two things in one slice, because the second is what replaces the first.

The personal dashboard said "Your entity is 65% accurate across 10 dimensions
of your life," with a percentage under each dimension and a score out of 100
on the entity page. Nothing measured accuracy. The number was a readiness
reading derived from deposit counts (`/api/archive/entity-accuracy`,
`lib/entityAccuracy.ts`), which is the density vanity number the coverage
work exists to retire. Under the standing integrity rule it should not have
said that. It is gone, on the dashboard and on /archive/entity, and the
personal tier now has a coverage map of its own, measured the same way the
business map is measured.

Decision taken with the founder before building: map now, family entity
next. See "What this map does not claim" below for why that sequencing
matters and what it leaves open.

---

## The taxonomy: eight kinds of judgment, one life

`lib/personalDomains.ts`. The founder's own description of his life is one
mural with no line between the business half and the rest. So the personal
map does not partition a life into spheres and probe each one. It partitions
by KIND OF JUDGMENT, exactly as the business map does, and lets each probe
land at home or at work. Family is inside every kind rather than a ninth box.

Same eight slots as `lib/b2bDomains.ts`, same order. Four keep their name,
four take a sphere-neutral name where the business word would be wrong for a
family:

| slot | business | personal |
|---|---|---|
| 1 | Decision-Making | Decision-Making |
| 2 | People | People |
| 3 | Risk | Risk |
| 4 | Capital | Money |
| 5 | Culture | Standards |
| 6 | Strategy | Direction |
| 7 | Adversity | Adversity |
| 8 | Succession | Legacy |

Renaming the business four to the neutral names would make it literally one
taxonomy. That touches `b2b_questions`, the succession dashboard, and the
state doc, and is its own decision. Not done here.

## The probes: p1

`lib/coverageProbesPersonal.ts`. 48 probes, six per domain, own-ground form
("name your own X and commit to it"), never rendered to a customer. Where a
business probe was already sphere-neutral it is kept nearly as is under its
own key (`p-` prefix, so results from the two sets cannot be confused). Where
the business probe named a company mechanism (hiring, pricing, a competitor,
an account) it is replaced by the life equivalent. A test pins that no probe
names a company mechanism, that no refusal candidate in `lib/foundingProof.ts`
is a probe in either set, and the copy rules.

## The pipeline

`lib/coverageSet.ts` is the one place segment maps to set: succession gets
the business set (v2), b2c gets the personal set (p1), anything else falls
back to the business set and is written off-label exactly as before.
`off_label` keeps its single meaning (the set does not match the segment) and
is now false on every real archive.

`lib/coverageRun.ts` picks the set at open-run, writes the set's version on
the run row, probes with the set's questions, frames the prompt with the
set's scope, applies hysteresis only within the set's version, rolls up
against the set's domains (`rollUpRun` takes a domain list, business by
default), and writes the set's version on every `archive_coverage` row. The
store neutrality tests are untouched and green: no SQL moved.

One new skip: an archive with no included training pairs is skipped before a
run row opens (`no included training pairs`). Every probe would run against
"No training data available yet." and every domain would read open, which a
count already says for free. Injected fixture content is not gated.

`lib/entitySystemPrompt.ts` takes `scope: 'business' | 'personal'`. Business
is the original, byte for byte, and the default. Personal swaps five framing
phrases ("the person now running their organization" becomes "someone in
their family," and so on), asserting each matched exactly once, the same
construction as the classifier scope. The grounding rules are identical in
both. `lib/foundingProof.ts` now passes the archive's scope too, so a personal
archive's proof is no longer framed around a successor. Not used by the family
chat route; see below.

`lib/inngest/coverageFunctions.ts`: the monthly sweep now requests every
archive, not only succession. The zero-pairs skip and one-at-a-time
concurrency bound the cost. `/api/archive/b2b-question/answer` sends the
first reading on founding completion for every tier.

`lib/coverageOwner.ts` reads rows filtered to the tier's set version, in the
set's domain order, with copy per scope. A family archive that once had a
diagnostic v2 run keeps those rows (business domain names) in
`archive_coverage`; they are never selected for a personal read, and never
shown. `app/archive/components/CoverageMap.tsx` renders whatever the API
returns and knows neither taxonomy.

## What this map does not claim

Recon found that the family entity at /archive/entity runs
`lib/entityContext.ts` (Opus, raw deposits plus witness deposits, transcripts,
documents) with NO grounding verifier. The refusal that hit home in the
founding proof came from the succession pipeline, which families never touch.

So a personal reading through the verifier can honestly say where the archive
is silent, because that is a property of the archive. It cannot say that
reaching past the archive is caught before anyone sees it, because on the
family route nothing catches it. Therefore, on a personal archive:

- the coverage count renders (the grounded line, the marks, the state word);
- the overreach line does not render on any domain;
- `OVERREACH_EXPLAINER` does not render;
- the caveat says it is a reading of the archive, not of a conversation, and
  that talking with the entity is a live exchange that can go differently.

The next slice, its own recon and its own gate, is moving the family entity
onto the grounded pipeline: `selectFrozenLayer`, `buildEntitySystemPrompt`
with scope personal, Sonnet, `verifyGrounding`, the gap reply. That touches
live family archives, their languages, and the contributor sources the
current prompt draws on, so it is not a side effect of this one. When it
lands, the overreach line and explainer can be turned on for personal
archives with a one-line change in `coverageOwner.ts`.

---

## Before first live use: one read-only query

`archive_coverage.domain` and `probe_set_version`, and `coverage_runs.segment`
and `probe_set_version`, are TEXT with no CHECK in the migration files. A
CHECK is NOT CONFIRMED until read another way. A personal run writes new
domain names (Money, Standards, Direction, Legacy) and the version `p1`, and
`writeCoverage` does not check the upsert error. Paste before the first
personal run:

    select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid in ('archive_coverage'::regclass, 'coverage_runs'::regclass)
      and contype = 'c';

Expected: the CHECKs on `state`, `overreach`, and `trigger_source` only. If
one names `domain`, `segment`, or `probe_set_version`, stop and say so; the
fix is a migration David pastes, not a code change.

## Preview and test

    git status --short
    git add -A
    git commit -m "Personal coverage map: eight kinds of judgment, p1 probes; accuracy score retired"
    vercel

On the preview, signed in on the Dr Ha archive:

1. /archive/dashboard. The "Your Entity 65/100" card is gone. In its place,
   "Where your archive is thin" with "Talk to your entity" in the header and,
   until a p1 run exists, "No reading yet."
2. /archive/entity. The left column reads "Your Entity," the state word, and
   "See where your archive is thin." No score, no bars. The wisdom nudge is
   still there when one is due.
3. Founder Test Archive dashboard: unchanged from this morning, all eight
   business domains with counts.

## First personal reading

Nothing triggers a run on an archive whose Founding Sequence completed before
this deploy (the send happens at completion). For the Dr Ha archive, request
one from the Inngest dashboard: Events, Send event, name
`coverage.run.requested`, data
`{"archiveId":"a38e4503-c7d2-4af3-af8c-cacd66974e0b","triggerSource":"manual"}`.
Or wait for the sweep on October 3. A run is 96 model calls plus retrieval,
roughly ten to twenty minutes with the concurrency limit.

Then paste:

    select domain, state, overreach, probes_deposit, probes_total,
           probes_errored, damped, probe_set_version, computed_at
    from archive_coverage
    where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
      and probe_set_version = 'p1'
    order by domain;

    select id, probe_set_version, segment, off_label, trigger_source,
           complete, ok, probes_total, probes_deposit, probes_errored, error
    from coverage_runs
    where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
    order by started_at desc limit 3;

Expected: eight p1 rows with the personal domain names; the run row
`segment = 'b2c'`, `off_label = false`, `probe_set_version = 'p1'`,
`complete = true`. Then reload the Dr Ha dashboard and check the grid against
the rows, `probes_deposit` of `probes_total`, row for row, no overreach line
on any domain.

## Rollback

`vercel rollback`. No migrations. p1 rows already written stay in
`archive_coverage` and are harmless: the previous build read every row for a
succession archive regardless of version, and a succession archive never gets
p1 rows.

## Flagged, not touched

- The family entity route is unverified. Next slice. Until then the personal
  map is coverage only, by design, stated above.
- `/api/archive/entity-accuracy` and `lib/entityAccuracy.ts` still exist and
  still compute the score, for the iOS app. Nothing on the web reads them.
  When the app moves to the map, delete both.
- /archive/entity still says "Every exchange makes it more accurate" and
  "Every session makes your entity more accurately you." Not numbers, but
  the same claim in words. A copy pass on that page is owed.
- The personal dashboard renders em dashes in the milestone label
  ("Milestone 1 — Foundations") and as the year placeholder in family
  memories. Pre-existing, outside this slice, against section 8.
- The `backed` threshold stays 6 of 6 for both sets. The count carries the
  signal, as designed.

Tests: `lib/coverageProbesPersonal.test.ts` (8), `lib/entitySystemPrompt.test.ts`
(3), `lib/coverageOwner.test.ts` (7), `lib/coverageRun.test.ts` (17, three
new), `lib/coverage.test.ts` (48, one new), `lib/foundingProof.test.ts` (4,
guard widened to both sets). Full local suite over the coverage, frozen
layer, founding, classifier, and proof modules: 116 green.

---

## Verified in production, September 15, 2026

Commit `2f48f57`, pushed to main, Ready with the basalith.ai alias. Inngest
synced the same commit at 12:38 PM Pacific, 13 functions, "Compute archive
coverage map" on `coverage.run.requested`.

First personal run, requested by hand from the Inngest dashboard, run
`3996f520-6b02-464c-8be6-114e14502dc1`:

    probe_set_version p1, segment b2c, off_label false, trigger_source manual,
    complete true, ok true, probes_total 48, probes_deposit 19,
    probes_errored 0, model_calls 144, error null

`model_calls` of 144 is 48 times 3, so retrieval fired on every probe: the
archive's 122 deposits put it over the frozen layer cap, and each question got
the layer the route would select for it. `error` null means none of those 48
retrievals fell back to quality order, which is the first exercise of the
September 10 retrieval work under a probe set it was not built against.

The map, all eight p1 domains, nothing damped, no discarded verdicts:

| domain | state | overreach | deposit of total |
|---|---|---|---|
| Decision-Making | partial | some | 2 of 6 |
| People | partial | none | 4 of 6 |
| Risk | partial | some | 2 of 6 |
| Money | open | none | 0 of 6 |
| Standards | partial | high | 5 of 6 |
| Direction | partial | some | 3 of 6 |
| Adversity | partial | some | 2 of 6 |
| Legacy | partial | some | 1 of 6 |

Deposit spread 5, better than either fixture persona (Margaret 5 of 6, Joey 4
of 6 were the v2 numbers, and this is a real archive). The set discriminates.
The dashboard rendered these counts row for row in set order with no overreach
line on any domain, as designed.

## FINDING: the overreach level has no minimum denominator

Recorded because it produced a false alarm in the session that shipped this,
and the next reader will hit the same trap.

`rollUpOverreach` in `lib/coverage.ts` computes the level over the ungrounded
probes ONLY, and applies `reached * 2 > ungrounded.length` with no floor on
`ungrounded.length`. So the better covered a domain is, the fewer ungrounded
probes it has, and the more its overreach label swings on a single verdict.

Standards above reads `high` on one ungrounded probe out of six. One of one is
a majority by arithmetic and carries no evidence. Money reads `none` over six
ungrounded probes and means something. The label is least stable exactly where
coverage is strongest, and most stable where it is weakest.

That is backwards from what the dimension is for. Overreach exists to rank
open domains by how often a successor hears a refusal, so its useful range is
domains with many ungrounded probes, where it happens to be stable. On a
nearly backed domain it is close to noise and should probably not render at
all.

Proposed fix, NOT made: require `ungrounded.length >= 3` before the level can
rise above `none`. Below that, report `none` and let the count carry the
domain. This changes what a live succession customer sees on the business map,
and the state doc records two prior threshold changes made as side effects
that had to be undone. It gets its own cycle with the threshold as the only
variable, measured before and after on both fixtures.

No effect on the personal map today, which renders no overreach line.
