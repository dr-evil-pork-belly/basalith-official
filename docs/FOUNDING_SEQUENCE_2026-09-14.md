# The Founding Sequence, build runbook. September 14, 2026.

Replaces the live Founding Session (90 minutes for a person, longer for a
business) with three incident interviews the owner runs in their own time, by
voice or typed, at /archive/founding. Design and reasoning:
`claude/BASALITH_ONBOARDING_REDESIGN_2026-09-14.md` in the project. Decisions
taken: founding fee holds at $2,500; B2C gets the async sequence plus a
twenty-minute first-read call by video; succession keeps one live dyad by
video after the sequence; acquisition unchanged.

Nothing here is a new engine. The recon found the owner-facing incident
interview already built and persisted (`/api/archive/b2b-question/next` and
`/answer`, `incident_sessions`, `lib/incidentSession.ts`), gated to
succession archives and surfaced only as a bare textarea on the succession
dashboard. This build opens it to every owner tier behind a guided surface.

No schema change. No migration. The founding marker rides the existing
`incident_sessions.state` jsonb.

---

## Files

New
- `lib/foundingSequence.ts`: seeds (personal and business, three calls each),
  the marker, pure status computation, `startFoundingCall`.
- `lib/foundingSequence.test.ts`: 10 tests, pure parts only. Green locally
  against the real module graph (incidentSession, renderProbe, supabase-admin).
- `lib/emails/foundingSequenceComplete.ts`: owner and internal emails on
  completion of call 3.
- `app/api/archive/founding/status/route.ts`: GET, read-only.
- `app/api/archive/founding/start/route.ts`: POST, opens the next call.
- `app/archive/founding/page.tsx`, `FoundingClient.tsx`: the surface.
- `app/archive/components/FoundingBanner.tsx`: dashboard pointer until done.

Changed
- `lib/incidentSession.ts`: optional `founding` marker on `IncidentState`
  (typed; reducer never reads it; `clone` preserves it).
- `app/api/archive/b2b-question/answer/route.ts`:
  - owner gate no longer requires `tier === 'succession'`; the no-open-incident
    fallback stays succession-only exactly as before (409 for other tiers);
  - optional `recordingId` links a transcript-only voice recording to the
    deposit (scoped to the archive, only if `deposit_id` is still null);
  - the post-response `classifyDeposit` and `createTrainingPairFromDeposit`
    calls now run under `after()` from `next/server` instead of
    `void`/`.catch(() => {})`. This is the standing serverless rule in
    CLAUDE.md section 1 applied to a route being edited, not a drive-by. Both
    fallback and incident branches;
  - when the third founding call completes, `after()` sends the two emails;
  - response gains `nextQuestion` and `founding` (additive).
- `app/api/archive/transcribe-voice/route.ts`: `mode=transcript_only` uploads,
  records, and transcribes but writes no deposit and no training pairs.
  Default behavior for every other caller is byte-for-byte unchanged.
- `app/archive/ArchiveLayoutClient.tsx`: nav item "Founding Sequence".
- `app/archive/dashboard/DashboardClient.tsx`, `SuccessionDashboard.tsx`:
  `<FoundingBanner />` above the fold.
- `CLAUDE.md` section 4: one paragraph naming the Founding Sequence.

---

## Before first live use: one read-only query

`incident_sessions` was created in the dashboard and has no migration in the
repo, so its CHECK constraints are NOT CONFIRMED. `startFoundingCall` inserts
`category` as 'judgment', 'conflict', or 'risk', the same strings the demo
fallback seeds use. If the column carries a CHECK that excludes any of them,
the insert fails and /founding/start returns 500. Paste this in the Supabase
SQL editor and read the result before the preview test:

    select conname, pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'incident_sessions'::regclass;

Expected: a primary key, the partial unique index on open incidents, and
either no CHECK on category or one that includes the three strings. If a
CHECK excludes them, change the three `category` values in
`FOUNDING_SEEDS` to values it allows; nothing else depends on them.

---

## Preview and test

    git checkout guide-cut-2026-09-14        # same branch as this morning
    git add -A
    git commit -m "Founding Sequence: async three-call founding on /archive/founding"
    vercel                                   # preview

Test as an owner on the preview. The Founder Test Archive
(`6c0722d3-719a-423f-9024-621ba0072d6f`, succession tier) exercises the
business seeds; any family archive exercises the personal seeds. Do not use a
real family archive for the voice path until step 4 is confirmed on the test
archive.

1. Sign in, open the dashboard. The Founding banner should read "Start with the
   Founding Sequence." Click it.
2. /archive/founding shows three call cards, all "Not yet started," and a
   Begin call 1 panel. Click Begin. The SEED probe appears with the label
   "Call 1 · The call."
3. Type an answer. Save and continue. The next probe appears (label "In
   order"). Reload the page: the same probe re-serves, nothing advances.
4. Click Speak instead. Record ten seconds. The transcript lands in the box.
   Edit a word. Save and continue.
5. Keep answering until the call closes (roughly 10 to 25 turns; a one-word
   answer on a spine probe triggers one re-probe, shown as "A little more, if
   you can"). The "Call 1 is in your archive" panel appears with a deposit
   count. Begin call 2.
6. Complete all three. The completion panel appears. Two emails should arrive:
   the internal one at mrdavidha@gmail.com and ADMIN_EMAIL, the owner one at
   the archive's owner_email.

Acceptance is pasted rows, not the screens. After step 4:

    select id, prompt, left(response, 60) as response, source_type, created_at
    from owner_deposits
    where archive_id = '<archive>' order by created_at desc limit 5;

    select id, deposit_id, transcript_status, duration_seconds
    from voice_recordings
    where archive_id = '<archive>' order by created_at desc limit 3;
    -- the voice turn's row must carry the deposit_id of the deposit above

    select id, status, phase, state->'founding' as founding,
           jsonb_array_length(state->'probeHistory') as turns
    from incident_sessions
    where archive_id = '<archive>' order by created_at desc;

    select id, metadata->>'probe_type' as probe, metadata->>'dimension' as dim
    from training_pairs
    where archive_id = '<archive>' order by created_at desc limit 5;
    -- confirms the after() path ran on the production lambda

Then promote the way you did this morning, and confirm on basalith.ai.

---

## Known limits, stated so nobody mistakes them for surprises

- The classifier prompt in `lib/incidentClassifier.ts` says "a founder" and
  "a past business decision." It extracts anchors and tensions from a
  personal-life answer fine, but a `scope` parameter that swaps those two nouns
  for personal archives is the right follow-up. Not done here: prompt edits get
  their own pass, and the succession path stays byte-identical this way.
- The daily reflection cron's succession branch will invite the founder to
  continue an open founding call in the portal (it reads the open incident).
  That is correct behavior. The email links to /archive/dashboard, where the
  banner takes them to /archive/founding.
- `lib/emails/foundingWelcome.ts` (the Stripe provisioning email, not yet live)
  still says "Your Legacy Guide." Fix it in the copy pass before live Stripe.
- The owner completion email promises one thing: a reply within 48 hours to
  set up the first read. It does not mention a coverage map or a proof card,
  because neither is an owner-facing surface yet.
- Voice: the transcript-only recording still lands in the voice-recordings
  bucket and `voice_recordings`, so the B2 backup covers it and the recording
  is preserved even though the deposit is written by /answer.

## Rollback

`vercel rollback`. No migrations to revert. Founding incidents already opened
stay in `incident_sessions` and are harmless to the succession dashboard,
which serves any open incident's pending probe.

## Next, in order

1. Site copy pass: retire "90 minutes," "three hours," "led in person," and
   "sits with you" on /families, /founding-session, /succession, /pricing,
   /faq, /method, /about, and the /pricing founding deliverables list.
   Describe the Founding Sequence and the first-read call by video. Nothing
   about a proof card or a coverage map until they ship to the owner.
2. Day-three proof card (one grounded answer with its deposit shown, one
   refusal) on the owner surface.
3. Coverage map v2 rendered to the owner.
4. Classifier `scope` parameter for personal archives.

---

## Addendum, September 15: classifier scope and the founding proof

Two of the four follow-ups above, built after the live run.

**Classifier scope.** `lib/incidentClassifier.ts` takes `scope: 'business' |
'personal'`. Business is the original prompt byte for byte and the default, so
the succession interview, the Guide demo, and every drive script are
unchanged. Personal is the same prompt with the speaker reframed ("a person,
about a decision in their own life"), and the tension rule now reads "in the
person's own terms; never translate a family or personal tension into business
vocabulary." `parseTimeline` takes the same scope. `/answer` passes
`scopeForTier(archive.tier)`. `lib/incidentClassifier.test.ts` pins that the
business prompt is untouched and that every substitution in the personal one
actually matched. Cause: a personal archive's tradeoff probe came back as
"protection or growth" on the live run.

**The founding proof.** `lib/foundingProof.ts`, `POST
/api/archive/founding/proof`, and a "Show me" card on the completion panel of
/archive/founding. One question the archive answers from a deposit, with the
deposit shown verbatim underneath, and one it declines. Runs the real
pipeline: `selectFrozenLayer`, `buildEntitySystemPrompt`, `claude-sonnet-4-6`,
`verifyGrounding`. Grounded half asks the owner's own founding call openers
back (SEED pairs first, then by quality, up to three tries) and shows only a
`basis === 'deposit'` result under the approved words "checked against your
archive." Refusal half asks up to three questions from `REFUSAL_CANDIDATES`
(per scope, deliberately not coverage probes, since the owner sees them) and
shows the first the verifier does not ground, tagged "no deposit covers this."
If either half comes up empty the card says so instead of faking it. Owner
only, requires all three calls complete, rate limited to 4 per IP per hour,
never stored, never logged to grounding_gaps. The owner completion email now
points at it. Tests: `lib/foundingProof.test.ts`, including a guard that no
refusal candidate is a coverage probe.

Not stored is a v1 choice. When a proper table exists for owner-facing
artifacts, persist the first proof so the owner can return to it.

Preview check for the proof: on your own archive, open /archive/founding, click
Show me. Expect one gold panel (your call opener, the entity's answer, your
deposit under it) and one plain panel (a question you never answered, declined
in the entity's words or the templated gap reply). Paste the response JSON if
either half is missing.
