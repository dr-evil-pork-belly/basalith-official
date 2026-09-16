# The family entity and the grounded pipeline. Recon, September 16, 2026.

Read-only. No file was edited for this document. Everything below was read
from the live repo on this date; line references are to those files as they
stand.

The question: what does it take to move the family entity at /archive/entity
onto the pipeline the succession entity runs, so that the refusal the founder
saw in the founding proof is what a family actually gets, and so the personal
coverage map measures the path that ships.

---

## 1. What the family route is today

`app/api/archive/entity-chat/route.ts`, prompt from `lib/entityContext.ts`.

Callers: `app/archive/entity/EntityClient.tsx` (owner, web, Supabase cookie),
`app/contribute/[token]/ContributeClient.tsx` (contributor, bearer token from
`contributors.access_token`, gated by `archives.contributor_entity_access`
none/preview/open), and the iOS app (owner, Supabase JWT in the Authorization
header per `lib/auth/getSessionUser.ts`; the app repo was not read). Response
contract: `{ response, sessionId, wasDeposit }`. Request: `{ message,
sessionId, conversationHistory }` with the last twenty turns.

Model: `claude-opus-4-6`, 600 tokens. No verifier of any kind between the
draft and the screen.

Sources the prompt draws on, per call: up to 50 `owner_deposits` (30 by a
keyword topic match plus 20 most recent, from the latest 500, `test_artifact`
excluded), up to 100 `labels` (photo memories written by family), 20
`people`, `decade_coverage`, 30 `witness_deposits`, 20 voice transcripts, 15
document transcripts, 10 video transcripts. Two prompt variants by archive
size (over 10 deposits or 20 labels is "rich"). Both instruct the model in
first person, "you never fabricate," "say I don't remember," end with one
question, respond in the language the user writes in.

Post-response work, all `void` or bare promise, none under `after()`: save
both turns to `entity_conversations`; if the message reads as a statement
(`isDeposit`: over 30 characters, not a question), insert it into
`owner_deposits` and create a training pair; increment `times_accessed` on
the deposits the prompt used and email a contributor the first time one of
theirs is used.

`entity_conversations` carries `accuracy_rating` and `correction` written by
`/api/archive/entity-feedback`; a correction becomes an owner deposit.

`lib/fidelityEval.ts` (Tests A and B) generates through this exact builder,
`GENERATOR_PATH_VERSION =
'entityContext.buildEntitySystemPrompt+excludeDepositIds+honestyClause-v1'`.

## 2. What the grounded pipeline is

`app/api/succession/entity/chat/route.ts`. Candidates are `training_pairs`
with `included_in_training = true`, quality order, up to 1000.
`selectFrozenLayer` picks up to 20 for the question (Haiku retrieval over the
cap, no call under it). `buildEntitySystemPrompt` from
`lib/entitySystemPrompt.ts` (now with `scope`). `claude-sonnet-4-6`, 1000
tokens. `verifyGrounding` reads the same 20 pairs, the question, and the
draft; `unsupported` replaces the draft with `groundingGapReply(topic)`;
every non-deposit verdict is logged to `grounding_gaps` under `after()`.
Response: `{ reply }`.

What becomes a training pair, from `lib/trainingPipeline.ts`: owner deposits
(any source_type, through `createTrainingPairFromDeposit`), voice recordings
(`createTrainingPairsFromVoice`, called by transcribe-voice), and contributor
answers (`createTrainingPairFromContributor`, called by `/api/contribute/answer`,
completion phrased as "X, who has known me as my Y, once said: ..."). Included
at `quality_score >= 50`.

What never becomes a pair, per the three creators read here:
`witness_deposits`, `archive_documents`, `archive_videos`, `people`,
`decade_coverage`.

CORRECTED the same day. The first draft listed `labels` here too. The live
distinct `training_pairs.source_type` values are companion, contributor,
deposit, label, owner, voice. Label pairs exist on three archives, and
`owner` and `companion` are sources the three creators above do not write. A
fourth creator exists and was not read. `lib/familyEntity.ts` treats `label`
as not the owner's voice pending that read.

ALSO FOUND by the sizing query: the included corpus is small against the
deposit corpus. Dr Ha, roughly 122 deposits, 31 included pairs. Hoa Le Tran,
18 pairs, 4 of them from deposits. Stevens Ha, 7. Before any archive moves
onto the grounded route its frozen layer has to be shown to hold its archive;
whether pairs were never created or were scored under 50 is the open question,
with the two queries in the move runbook.

## 3. The divergences, each with its consequence

**No verifier.** The family draft ships as written. The prompt asks the model
not to fabricate; nothing checks. The personal coverage run on the Dr Ha
archive found the entity reaching past the archive on some ungrounded
probes in six of eight domains (under the grounded prompt, which is stricter
than the family one). On the family route every one of those reaches would
have reached the screen.

**Different corpus.** Family: raw deposits selected by keyword overlap, plus
five kinds of material that are not deposits. Grounded: scored pairs
selected by a retrieval model. Moving means the entity loses labels, witness
deposits, documents, videos, people, and decades as prompt material. Of
those, only documents and videos are the owner's own words, and they are
lost only because nothing turns them into pairs. Labels and witness deposits
are other people's words about the owner. The current prompt uses them for
texture and attribution ("my child once noticed that..."). Whether that
texture belongs in a grounded answer is a product decision, section 6.

**Different model and budget.** Opus 600 versus Sonnet 1000. The succession
route standardized on Sonnet for both voice and verifier (CLAUDE.md section
4). Same here would be consistent; nothing measured says Opus is better on
this task.

**Different character.** The family prompt is a companion: curious, ends
every turn with one question, coaches the person to deposit. The grounded
prompt is a reference: three to six sentences, states what the record
settles, declines what it does not, asks nothing. A family member who is
used to being drawn out will notice. This is the largest experiential change
and it is the point of the move, but it is a change.

**Language.** The family prompt answers in the language of the question. The
grounded prompt says "American English" and its gap reply is an English
template. The Hoa Le Tran and Cindy Ha archives are live family archives and
their contributors are not all writing in English. A move without a language
plan is a regression for them. Section 6.

**Deposit usage tracking.** The family route knows which deposits it used
(`usedDepositIds`) and emails contributors on first use. The grounded route
knows which pairs it selected; `training_pairs.source_id` maps a deposit pair
back to its deposit and a contributor pair carries the contributor name in
metadata. The feature survives a move with a small mapping. It is not free.

**Serverless.** Every post-response write on the family route is `void` or a
bare promise. CLAUDE.md section 1 says these die on lambda freeze. The route
being edited is the standing reason to bring them under `after()`.

## 4. Findings that stand on their own, whatever is decided

**A contributor's statement is saved as the owner's deposit.** The
`isDeposit` branch in entity-chat does not check `callerType`. When a family
member talking to the entity through the contributor portal writes anything
over thirty characters that is not a question, it is inserted into
`owner_deposits` with no `contributor_id` and no `source_type`, and
`createTrainingPairFromDeposit` turns it into a pair in the owner's first
person. From that point the verifier will ground the owner's "position" in a
sentence a relative typed. This is live now, on the current route, and it is
exactly the failure "checked against your archive" is supposed to rule out.
Fix regardless of the move: contributor turns never auto-deposit, or deposit
with `contributor_id` and `source_type = 'contributor'` so the pair is
attributed. The former is safer; a contributor already has a deliberate
deposit path at `/api/contribute/answer`.

**Contributor pairs ground positions.** `createTrainingPairFromContributor`
writes "Cindy, who has known me as my wife, once said: ..." as a completion.
The auditor is told these are the founder's own recorded statements. So a
relative's account of what the owner believes can back a "deposit" verdict on
the owner's position. This is true on the succession route today too. It is
hearsay grounding and it should either be excluded from the verifier's
deposit set or labeled to the auditor as reported rather than stated. Not a
blocker for the move; a decision the move makes visible.

**A third, unverified entity prompt exists.** `app/api/cron/entity-letter/route.ts`
generates a monthly letter to the owner from recent training pair prompts
with its own builder, "You think, speak, and reason exactly as X does." That
sentence is the claim CLAUDE.md section 8 forbids, inside a prompt whose
output is emailed to the owner unverified. Outside this slice. Listed so it
is not found by accident later.

## 5. What has to be preserved through a move

The request and response contract, because iOS calls it and the app repo is
not in this session. The contributor bearer path and the
`contributor_entity_access` gate. The `entity_conversations` write and the
feedback loop on it. The owner auto-deposit on statements (owner only, see
section 4). Deposit-usage tracking and the contributor email, mapped through
`source_id`. `fidelityEval` must get a new `GENERATOR_PATH_VERSION` and Tests
A and B re-baselined, or the eval keeps measuring a path families no longer
get.

## 6. Decisions the founder has to make before this is built

1. **Character.** Move the family entity fully to the grounded reference
   voice, or keep a companion behavior for the owner's own sessions (where
   the point is to draw deposits out) and use the grounded voice for
   contributors (where the point is to answer from the record). Two prompts
   on one route is more surface; one voice is simpler and more honest.
   Recommendation: one voice, grounded, for everyone. The dashboard already
   has surfaces whose job is to draw deposits out. The entity's job is to
   answer from the archive or say it cannot.

2. **Texture sources.** Let documents and videos become training pairs (they
   are the owner's own words, and voice already does this), so they enter the
   frozen layer on their own merit. Leave labels, witness deposits, people,
   and decades out of the entity prompt. Recommendation: yes to documents and
   videos through the pipeline, its own small slice; no to the rest.

3. **Language.** The personal scope of the grounded prompt gets a language
   instruction (answer in the language of the question, keep the grounding
   rules). The gap reply gets a translation table for the languages the
   product already serves, keyed off the contributor's or archive's
   `preferred_language`, with English as the fallback. A second model call to
   translate the decline is the alternative and reintroduces a generation
   step after the verifier, which is the thing the design exists to avoid.
   Recommendation: the table.

4. **Hearsay grounding.** Exclude contributor pairs from the set the verifier
   is shown, or keep them and accept that a relative's account can ground the
   owner's position. Recommendation: exclude from the verifier's deposit set,
   keep in the voice prompt as texture. This changes the succession route's
   behavior too and needs the two-layer gate.

5. **Rollout.** One route serves every family archive. Either it moves for
   all of them at once, or a per-archive switch (a column on `archives`,
   default off, a migration the founder pastes) lets the Dr Ha archive go
   first and the two live family archives follow after a conversation in
   their languages has been read by a person. Recommendation: the switch.
   The cost is one column and one condition; the benefit is that no family
   meets the new voice before someone has.

## 7. Slice shape, once those are decided

- `lib/entitySystemPrompt.ts`: language line in the personal scope, business
  untouched (test pins bytes).
- `lib/verifyGrounding.ts`: `groundingGapReply(topic, language)` with a
  table; the English string byte-identical to today (the two-layer harness
  scores against it).
- `app/api/archive/entity-chat/route.ts`: same contract; internals become
  candidates read, `selectFrozenLayer` with prior questions from history,
  `buildEntitySystemPrompt` scope personal, Sonnet 1000, `verifyGrounding`,
  gap reply, gap log under `after()`; conversation save, owner-only
  auto-deposit, usage tracking all under `after()`; contributor statements
  never auto-deposit; behind the archive switch, falling through to the
  current builder when off.
- `lib/fidelityEval.ts`: new generator path version.
- `lib/coverageOwner.ts`: overreach line and explainer on for personal
  archives whose switch is on, since the claim becomes true for them.
- Gates before preview: `scripts/two-layer-probe.ts` unchanged and green on
  the Founder Test Archive (proves the business prompt did not move); a
  personal run of the same harness shape on the Dr Ha archive; the existing
  `lib/coverageRun.test.ts` and prompt tests; one real conversation on Dr Ha
  in English and one in a second language, read by the founder, pasted.
- Migration for the switch, pasted by the founder before the deploy.

Not in the slice: documents and videos into the pipeline (its own), the
entity-letter cron (its own), the contributor-as-owner deposit fix if the
founder wants it shipped ahead of the move (it is four lines and can go
alone).
