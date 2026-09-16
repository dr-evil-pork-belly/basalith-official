# The family entity onto the grounded pipeline. Build, September 16, 2026.

Recon and the five decisions: `docs/FAMILY_ENTITY_RECON_2026-09-16.md`.
Decisions taken: one grounded voice for everyone (1); documents and videos
into the training pipeline as their own later slice (2); a language line in
the personal prompt and a translation table for the gap reply (3); owner-only
corpus now, labeled hearsay as its own later slice (4, revised from the recon
after the sizing showed two to four contributor pairs per archive and the
first proposal was found to break the "verifier sees what the voice saw"
invariant); a per-archive switch, temporary (5).

NOTHING CHANGES FOR ANY ARCHIVE ON DEPLOY. `archives.entity_pipeline`
defaults to 'context' and the route reads it tolerantly, so before the
migration is pasted and before any row is flipped, every family archive
answers exactly as it did, with two exceptions that were bugs on the old path
and are fixed on both paths, below.

---

## Files

New
- `lib/familyEntity.ts`: the grounded turn (`generateGroundedFamilyReply`),
  the owner-only candidate read, the tolerant switch read, and the pure
  helpers (`isDeposit` moved from the route, `sanitizeHistory`,
  `priorQuestions`, `ownerOnly`, `depositIdsBehind`, `gapLanguage`).
- `lib/familyEntity.test.ts`: 6 tests.
- `supabase/migrations/20260916_entity_pipeline.sql`: the switch. Founder
  pastes.
- `docs/FAMILY_ENTITY_MOVE_2026-09-16.md`: this file.

Changed
- `app/api/archive/entity-chat/route.ts`: two pipelines behind the same
  request and response contract, chosen by the switch. The 'context' branch
  is the old builder, Opus, no verifier. The 'grounded' branch is
  `generateGroundedFamilyReply` plus the gap log. Both branches: a
  contributor's turn is never auto-saved as the owner's deposit; every
  post-response write runs under `after()`; history is sanitized to string
  user and assistant turns.
- `lib/entitySystemPrompt.ts`: one more personal-scope substitution, the
  closing rule "American English" becomes "Answer in the language the question
  was asked in." Business unchanged byte for byte (test pins it).
- `lib/verifyGrounding.ts`: `groundingGapReply(topic, language = 'en')`.
  English unchanged byte for byte. Seven other languages, the ones
  `lib/emailTranslations.ts` serves, as topic-free declines. One em dash
  removed from the header comment.
- `lib/coverageOwner.ts`, `app/api/archive/coverage/route.ts`: a personal
  archive on 'grounded' now renders the overreach line, a family explainer,
  and the same caveat shape as business, because the claim is true for it.
  On 'context' nothing changes.
- `docs/FAMILY_ENTITY_RECON_2026-09-16.md`: corrected (label pairs exist;
  the corpus finding).

Not changed, on purpose
- `lib/entityContext.ts`. Still the 'context' builder. Deleted when the last
  archive flips.
- `lib/fidelityEval.ts`. Still generates through the 'context' builder, so
  Tests A and B remain valid for an archive on 'context' and INVALID for one
  on 'grounded'. Re-baseline per archive when it flips; delete the generator
  when the builder goes.
- The auditor prompt in `lib/verifyGrounding.ts`. Not a character changed.
  The G7 instrument is untouched.

## The two fixes that apply to every archive today

**Contributor turns no longer become owner deposits.** `isDeposit` now runs
only for `callerType === 'owner'`. Until this deploy a family member's
statement through the contributor portal was inserted into `owner_deposits`
with no `contributor_id` and turned into a first-person training pair. Rows
already written that way are not touched by this slice; finding them is a
query on `owner_deposits` where `prompt = 'Entity chat deposit'` and
`contributor_id is null`, joined against `entity_conversations` to see who
was in the session. Whether to reattribute or delete is the founder's call.

**Post-response writes survive the lambda.** Conversation save, owner
auto-deposit, usage tracking, and the gap log all run under `after()`.

## Before the first flip: the corpus question

The grounded route reads only `training_pairs` with `included_in_training`
and an owner-voice `source_type`. The sizing on September 16 showed 31 such
pairs on the Dr Ha archive against roughly 122 deposits. A frozen layer that
holds a quarter of the archive is not the archive. Run both, paste both:

    select archive_id, source_type, included_in_training, count(*) as pairs,
           round(avg(quality_score)) as avg_quality
    from training_pairs
    group by 1, 2, 3
    order by 1, 2, 3;

    select archive_id,
           count(*) filter (where contributor_id is null) as owner_deposits,
           count(*) as all_deposits
    from owner_deposits
    where test_artifact is not true
    group by 1
    order by 1;

Large `included_in_training = false` counts mean the threshold (50 here, 60
in the god route, unreconciled per CLAUDE.md section 6). Pairs missing
against the deposit counts mean creation never ran for older deposits and a
backfill is needed. Either is its own slice. No archive flips until its layer
is shown to hold its archive.

## Migration

Paste `supabase/migrations/20260916_entity_pipeline.sql`. Then confirm:

    select column_name, data_type, column_default
    from information_schema.columns
    where table_name = 'archives' and column_name = 'entity_pipeline';

    select conname, pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'archives'::regclass and conname like '%entity_pipeline%';

## Preview and gates

    git add -A
    git commit -m "Family entity: grounded pipeline behind a per-archive switch; contributor turns no longer become owner deposits"
    vercel

Gates, before anything is promoted:

1. `npx tsx scripts/two-layer-probe.ts` on the Founder Test Archive, as
   before. It imports `buildEntitySystemPrompt` with no scope and
   `groundingGapReply(topic)` with no language, so it exercises the business
   bytes and the English reply, both pinned unchanged by tests. Paste the
   flip rates. This is the CLAUDE.md section 10 gate for anything touching
   `verifyGrounding.ts`.
2. On the preview, signed in on the Dr Ha archive with the column still
   'context' (or not yet pasted): one conversation at /archive/entity. It
   should read exactly as before. Paste the exchange.
3. Flip Dr Ha: `update archives set entity_pipeline = 'grounded' where id =
   'a38e4503-c7d2-4af3-af8c-cacd66974e0b';` Then two conversations at
   /archive/entity, one on a covered area (People, five of six on the map)
   and one on Money (none of six). Expect a plain first-person answer on the
   first and a decline on the second. Paste both. Then:

        select question, basis, created_at
        from grounding_gaps
        where archive_id = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
        order by created_at desc limit 5;

   The Money question should be there. That proves `after()` ran on the
   lambda, which nothing local can.
4. Reload the Dr Ha dashboard. The coverage block should now show the
   overreach line under each area, the family explainer, and the live
   caveat.
5. One conversation in a second language on Dr Ha, asked about Money, so the
   decline comes back from the table. Read it. A native reader confirms each
   language's decline before an archive in that language flips.

Then promote. Flip Hoa Le Tran and Cindy Ha only after step 5 has been done
for their languages and a person has read a conversation on each.

## Rollback

`vercel rollback`, or per archive: `update archives set entity_pipeline =
'context' where id = '<id>';` No data to revert. Gap log rows written for a
family archive are true records and stay.

## Flagged, not touched

- `app/api/cron/entity-letter/route.ts`: a third entity prompt, unverified,
  emailed to owners monthly, opening with the claim section 8 forbids.
- Label pairs: a creator not yet read; excluded from the owner voice until it
  is.
- Documents and videos into the training pipeline: decision 2, its own slice.
- Labeled hearsay for the auditor: decision 4 later half, its own slice, needs
  the two-layer gate and a look at where G7 Stage 2 stands.
- The old unattributed contributor deposits already in `owner_deposits`.
- `/archive/entity` copy still says exchanges make the entity "more accurate."

Tests: 124 green across the coverage, frozen layer, founding, classifier,
proof, prompt, and family entity modules.
