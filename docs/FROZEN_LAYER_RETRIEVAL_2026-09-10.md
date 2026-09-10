# Frozen layer retrieval on the succession route

Heritage Nexus Inc. · September 10, 2026. Build runbook. Nothing here is
deployed; David reviews, runs the gates, previews, and promotes.

---

## 1. THE DEFECT

`app/api/succession/entity/chat/route.ts` read the twenty highest
`quality_score` training pairs for the archive and sent them as the frozen
layer, whatever the successor asked:

```
.eq('included_in_training', true)
.order('quality_score', { ascending: false })
.limit(20)
```

Quality order is not relevance order. Every archive above twenty pairs sent
the same twenty rows to every question. Illustrative case, not an observed
archive: a founder with four capital deposits and forty stronger people
deposits hands a successor asking about capital a layer with no capital in it,
and the verifier then correctly refuses an answer the archive could have
supported. The milestone ladder counted density the
successor never received. BASALITH_COVERAGE_MAP_STATE section 4 recorded the
symptom as a measurement ceiling ("a six-of-six domain is unreachable for any
archive at any density"). It was a product defect.

`lib/coverageRun.ts` and `scripts/two-layer-probe.ts` ran the identical
query, so the map and the security gate measured the same defect faithfully.

## 2. THE CHANGE

One new module, `lib/frozenLayer.ts`, and three callers routed through it.

`selectFrozenLayer({ question, priorQuestions, candidates })`:

- `candidates` is the WHOLE included corpus for the archive, in quality order,
  read with `.limit(FROZEN_LAYER_CANDIDATE_LIMIT)` (1000, the PostgREST
  default row ceiling).
- At or under `FROZEN_LAYER_LIMIT` (still 20): every pair is sent, no model
  call. Byte-identical to the previous behavior. This is what keeps the
  fifteen-pair fixtures and every registered G7 arm exactly as they were.
- Over the cap: one `claude-haiku-4-5-20251001` call at temperature 0 reads
  the question and a numbered list of the candidates (prompt and completion
  excerpts) and returns the positions that bear on the question. Those are
  kept, the layer is filled to the cap with the highest quality unpicked
  pairs, and the result is presented in quality order. Earlier user turns in
  the conversation ride along as context so a follow-up still retrieves
  against the thread.
- On any retrieval failure (thrown call, a call past `RETRIEVAL_TIMEOUT_MS`
  of 15 seconds with one retry, unreadable reply): the previous behavior,
  quality order top twenty, with `method: 'fallback_quality'` and the error
  in the return value. Never an error to the successor, never an empty layer.
- `FROZEN_LAYER_RETRIEVAL=off` in the environment turns retrieval off on
  purpose: `method: 'disabled'`, no call, quality order top twenty. It is the
  same-day control arm (section 5.4) and the production kill switch. It is
  not a fallback.
- The verifier is run against the SAME selected pairs. "Checked against the
  archive" describes exactly what the entity was shown.
- All three readers now order by `quality_score desc, id asc`. `quality_score`
  is an integer, so ties are the common case, and without a second key the
  candidate order could change between requests, which defeats the prompt
  cache and makes "same layer" mean different things. For an archive at or
  under the cap this changes only the order among tied rows inside the
  prompt, which was already undefined before.

Callers:

- `app/api/succession/entity/chat/route.ts`: reads the corpus, selects per
  request, logs one line (`[succession-entity] <archiveId> frozen layer N of M
  candidates, method retrieved, retriever picked K [pair ids]`) so a run of
  fallbacks is visible in Vercel logs and a pick can be traced to rows. Ids
  only, never deposit text.
- `lib/coverageRun.ts`: reads the corpus once, selects per probe, builds the
  system prompt per probe, verifies against the selected layer. The result
  carries `retrievalCalls` and `retrievalFallbacks`. `model_calls` on the run
  row counts retrieval calls (two per probe plus one per probe that called).
  A run with any fallback writes `retrieval fell back to quality order on N
  of 48 probes` into the run row's `error` while leaving `ok` and `complete`
  alone, so the row itself says the map was not measured on the retrieval
  path. The open-run step logs the serialized size of the candidate set,
  because on the Inngest path that value is memoized and replayed into every
  later step; it was twenty rows before and is now the corpus.
  `FROZEN_LAYER_LIMIT` is re-exported from here so existing importers keep
  working.
- `scripts/two-layer-probe.ts`: reads the corpus, selects once per domain
  question, prints the selection per domain in the header, and EXITS NONZERO
  if any domain fell back, so its output can never be pasted as evidence for
  the retrieval path when it measured the old layer. `disabled` runs.
- `scripts/coverage-drive.ts`: prints a FROZEN LAYER block (included pairs,
  cap, retrieval calls, fallbacks) with a banner on any fallback and a banner
  when the switch is off.
- Comment-only edits so no file describes the old mechanism: `lib/coverage.ts`
  (spread rationale), `scripts/coverage-fixture-probe.ts` (under-cap
  assertion), `lib/inngest/coverageFunctions.ts` (cost).

Unchanged on purpose: `lib/entitySystemPrompt.ts` (no prompt text moved),
`lib/verifyGrounding.ts`, the cap (20), `app/api/demo/succession-entity/
route.ts` (personas at 15 pairs sit under the cap, so routing the demo through
the selector would change nothing and add a code path to keep in step),
`lib/entityContext.ts` (the B2C entity has its own keyword retrieval and is a
separate cycle).

Why a model and not keywords or embeddings, recorded in the module header:
keyword overlap misses paraphrase, which is the orthogonality failure
COVERAGE_MAP_V2 recorded and would refuse on covered ground; embeddings need
a vendor this repo does not have, disclosed as a subprocessor, plus a
migration and a backfill, which is a governance decision first. The function
signature is the seam. Swapping the retriever later touches one file.

## 3. FILES

```
lib/frozenLayer.ts                              new
lib/frozenLayer.test.ts                         new, 16 tests
lib/coverageRun.ts                              modified
lib/coverageRun.test.ts                         modified, 15 tests (2 rewritten, 2 added)
app/api/succession/entity/chat/route.ts         modified
scripts/two-layer-probe.ts                      modified
scripts/coverage-drive.ts                       modified
lib/coverage.ts                                 comment only
scripts/coverage-fixture-probe.ts               comment only
lib/inngest/coverageFunctions.ts                comment only
docs/FROZEN_LAYER_RETRIEVAL_2026-09-10.md       this file
```

No migration. No new dependency. No schema touched. One optional environment
variable, `FROZEN_LAYER_RETRIEVAL`, read only when set to `off`; unset means
retrieval is on.

## 4. WHAT WAS RUN BEFORE THIS LANDED ON DISK

In a clean copy with the repo's own lockfile:

```
npx vitest run lib/frozenLayer.test.ts lib/coverageRun.test.ts
  Test Files  2 passed (2)
       Tests  31 passed (31)

  20 candidates, cap 20: method all, calls 0
  30 candidates, picks [29,25,22] (1-based): method retrieved, layer 20
  layer ids: pair-0 ... pair-16 pair-21 pair-24 pair-28
  thrown call: method fallback_quality, error "ECONNRESET"
  switch off: method disabled, calls 0
  model calls 48, retrieval calls 0                       (archive under the cap)
  injected 25 pairs, cap 20: retrieval calls 48, voice calls 48, layer in last prompt 20
  fallbacks 48 of 48, run row error: "retrieval fell back to quality order on 48 of 48 probes"

npx tsc --noEmit    clean on every changed file
npx eslint          clean on every changed file
```

Nothing above reached Anthropic or Supabase. It proves the mechanism and the
neutrality under the cap. It does not prove the retriever picks well on a real
archive. Section 5 does that. An independent review pass over the diff was
run before it landed on disk; its findings (fallbacks invisible on the run
row, no request timeout, a stored baseline in this runbook where the repo's
own method requires a same-day control, stale comments in three untouched
files) are what sections 2 and 5.4 now reflect.

## 5. ACCEPTANCE, IN ORDER

Branch first. The files are already in the working tree.

```
git checkout -b frozen-layer-retrieval-2026-09-10
git status
```

### 5.1 Unit and type gates

```
npm test
npx tsc --noEmit
```

Expect every suite green, including the two above.

### 5.2 Fixture neutrality (no retrieval under the cap)

```
.\scripts\coverage-acceptance.ps1
```

Expect the usual ALL GATES PASS, the header line "personas at 15 and 15
pairs, cap unreached", and run rows with `model_calls` equal to twice the
probe count. If a fixture run shows more than two calls per probe, retrieval
engaged where it must not, and that is a failure of this build.

### 5.3 The security gate

```
npx tsx scripts/two-layer-probe.ts
```

The header now prints CANDIDATES (the corpus size) and one line per domain
with the selection method. Expect the same two-sided result as before: equity
flip near 0, hiring decisive and correct. Paste the header and the RAW
PRODUCTION CONFIG block.

Whether retrieval engages here depends on how many included pairs the Founder
Test Archive holds. Read it first:

```sql
select count(*) as included_pairs
from training_pairs
where archive_id = '6c0722d3-719a-423f-9024-621ba0072d6f'
  and included_in_training = true;
```

Under 21, every domain prints `method all` and the gate is a pure regression
check. Over 20, each domain prints `method retrieved` and the gate is also the
first live read of the retriever.

### 5.4 The real archive, same-day control, prediction written down first

`lib/entitySystemPrompt.ts` records why a stored baseline does not count as a
control: the verifier drifts, the prompt has moved twice since the last
recorded a38e4503 figures, and a delta against a number from another day
measures the day as much as the change. So this is two drives, same day, one
variable.

Control arm first, retrieval switched off on purpose:

```
$env:FROZEN_LAYER_RETRIEVAL = 'off'
npx tsx scripts/coverage-drive.ts a38e4503-c7d2-4af3-af8c-cacd66974e0b
Remove-Item Env:FROZEN_LAYER_RETRIEVAL
```

Then the treatment arm:

```
npx tsx scripts/coverage-drive.ts a38e4503-c7d2-4af3-af8c-cacd66974e0b
```

Dr. Ha's archive is off-label for the b2b probe set and that is fine here: it
is the densest archive there is and the question is whether retrieval reaches
pairs the cap dropped, not what the map says about a founder.

PREDICTION. The control arm's FROZEN LAYER block reads `method disabled`
banner, 0 retrieval calls. The treatment arm reads included pairs above 20,
48 retrieval calls, 0 fallbacks. Treatment `deposit` is above control
`deposit` by more than probe noise (probe basis drift has measured 6 to 8 of
48 between identical runs, so call it more than 8 probes). FALSIFIER: if the
treatment arm's deposit is within 8 of the control arm's, retrieval is not
reaching pairs the cap was dropping on this archive, and the first knob is
the retriever instructions in `lib/frozenLayer.ts`, not the cap. If
treatment overreach rises alongside deposit, read the replies in the WHY block
before concluding anything: more relevant material in the layer can also give
the entity more to over-extend from, and that would be a finding against
filling to the cap.

The DELTA block in the treatment run compares against the most recent ok run
at the same probe set version, which is the control arm you just ran. Paste
both FROZEN LAYER blocks, both maps, and the treatment DELTA block. If either
run shows a fallback count above zero, it is not evidence; fix the cause and
re-run the pair.

### 5.5 Preview, then a live turn

```
vercel
```

Open the successor portal on the preview URL against a succession archive,
ask one question in a domain the archive covers and one it does not. Read the
Vercel function log for the `[succession-entity]` line on each turn. Expect
`method all` or `method retrieved`, never a run of `fallback_quality`.

Then promote, your call, and confirm the Inngest app page shows the deployed
commit (standing check, CLAUDE.md section 6).

## 6. WHAT THIS DOES NOT DO, AND WHAT FOLLOWS

- The cap is still 20. Raising it is its own cycle: the coverage thresholds
  were set against the cap (COVERAGE_MAP_STATE section 4) and should move for
  one reason at a time.
- The retriever's picks are not stored. The pair ids are in the return value
  and in the route's log line only. Storing them is the data the "show the
  deposit under the answer" surface needs, and it is a migration, so it is not
  folded in here.
- The open-run step on the Inngest path now memoizes the whole candidate set.
  At 1000 pairs of ordinary length that is well under Inngest's step output
  ceiling and Vercel's request body limit, and the size is logged on every
  run. If an archive ever approaches either limit, the fix is to return ids
  from the step and re-read by id inside each probe, not to raise a limit.
- The demo route is not routed through the selector (see section 2). If a
  persona ever grows past the cap, route it then.
- G7: no prompt text changed and the fixtures make no retrieval call, so no
  registered arm is affected. If a Stage 2 arm ever runs against a real
  archive over the cap, retrieval becomes a study parameter and should be
  pinned to this commit.
- Prompt caching on the candidate block engages only above the model's
  minimum cacheable length. Below it the marker is ignored at no cost.
- `FROZEN_LAYER_CANDIDATE_LIMIT` is 1000 because PostgREST returns at most
  1000 rows per request by default. No archive is near it. An archive that
  reaches it needs paging in the read, not a larger literal.

## 7. RESULT, 2026-09-10, acceptance run on the branch

Run by David from `frozen-layer-retrieval-2026-09-10`, dirty tree, via
`.\scripts\coverage-acceptance.ps1`. Every gate passed. Pasted evidence is in
`.probe-out/coverage-acceptance-20260910-125605.txt` and its captures.

What each gate showed:

- `npm test`: 21 files, 555 tests, green. `npx tsc --noEmit`: one error in
  `lib/frozenLayer.test.ts` (Next's global types make `NODE_ENV` a required
  key on `ProcessEnv`), fixed by typing the env parameter as a plain string
  map; clean after.
- Two-layer probe: the Founder Test Archive holds 16 included pairs, under
  the cap, so every domain printed `method all` and the gate was a pure
  regression check. Flip 0 of 10 on all three uncovered domains, hiring 10 of
  10 decisive, contrary note held 9 of 10. Demo refusal probe ALL PASS.
- Fixture probe: Margaret 15 pairs, Joey 17 pairs, cap unreached, no
  retrieval call. Drift 4 and 6 of 48, domain drift 0 and 1, all six gates
  pass. Neutrality under the cap holds on the fixtures.
- Live drive on a38e4503: 25 included pairs, cap 20, 48 retrieval calls of
  48, 0 fallbacks, `model_calls` 144, run ok and complete. The mechanism runs
  end to end on a real archive with no errors.

THE PREDICTION IN 5.4 WAS WRONG, AND WRONG FOR A REASON THAT WAS CHECKABLE.
It said treatment deposit would exceed control deposit by more than 8. The
drive's delta against the September 1 run read deposit 5 to 4, overreach 3 to
2, declined 40 to 42, one domain (Culture) moving partial to open on a single
probe. That is inside probe noise. Retrieval did not raise grounded coverage
on this archive.

It could not have. The archive has 25 included pairs and the cap is 20, so
retrieval can swap in at most the 5 pairs the old query dropped, and those
are by construction the 5 lowest quality pairs in the corpus. An 8-probe rise
was never reachable from 5 pairs of headroom, and the archive is a family
archive probed with business questions, so the pairs a Capital or Strategy
probe would want do not exist to be retrieved. The candidate count was one
query away and the prediction was written without it. Recorded here so the
next prediction on this surface starts from the headroom, not from the
mechanism.

WHAT THIS RUN PROVES AND DOES NOT PROVE. It proves the retrieval path works
on a real archive, counts its calls correctly, never fell back, and changed
nothing measurable where it had almost nothing to change, which is the right
result for a change that must be neutral at the margin. It does not prove
retrieval raises coverage. No archive exists today that could prove that: the
only succession-tier archive holds 16 pairs. The benefit claim stays open
until a founder archive well over the cap exists, which is the same pilot the
transfer process review already asked for. Until then retrieval is dormant on
every succession archive and engages only on Dr. Ha's, off label.

The paired same-day control in 5.4 was not run and is not worth running on
a38e4503, for the headroom reason above. Keep 5.4 as the method for the first
archive with real headroom; change the threshold to something the headroom
can reach.

DECISION. Ship it. Verified neutral under the cap, verified working over the
cap, gates green, nothing regressed. The kill switch is in place. The claim
that ships with it is the mechanism, not a result, which is the only claim
the integrity rule allows here anyway.
