# The word "archive" leaves the product, September 18, 2026

Heritage Nexus Inc. Vocabulary pass across `basalith-official`. Written to disk by
Cowork, uncommitted. David reviews, runs `npx tsc --noEmit`, previews, commits, and
promotes.

## The decision

David's call, September 18: "archive" devalues the product. It names the input (a
pile of deposits) when the customer pays for the output (a first-person answer
confined to what they settled, a plain refusal where they never settled it, a map of
where the refusals fall). It anchors the price to storage, it is the wrong tense for a
living depositor, and it puts Basalith in the "documentation, data room" bucket the
pitch turns away from. The analysis is in the project as
`claude/BASALITH_ARCHIVE_WORD_2026-09-18.md`.

Three words replace it, one per layer. David chose Basalith-as-noun.

- **A Basalith** is the thing the customer owns. Always with a determiner: "your
  Basalith," "a family Basalith," "the Chen Basalith." Bare "Basalith" is the
  company. Verbs: begin, found, build, resume, pause, download, keep, own,
  contribute to, enter.
- **The record** is the evidence, and the word for every mechanism sentence:
  "checked against the record," "where the record is silent, it says so," "confined
  to the record," "on the record." Never a button, a nav label, or a standalone
  heading, because the capture pages already say "recording."
- **The entity** is unchanged.

"Archive" stays where it is a code word: identifiers, `archives` and `archive_id`,
`/archive/*` and `/api/archive/*` routes, bucket names, RPC and Inngest names, Stripe
keys, cookie names, log lines, code comments, test titles. The `/archive/*` URL path
is not renamed in this pass; that waits until after portal stone slice 5, in one
deploy, with redirects, if at all.

## Scope: 161 files changed

Recon first: 8,034 raw hits of "archiv" across 504 staged source files. Word-level
classification found 792 string-literal hits and 205 bare JSX text lines that were
reader-facing or model-facing. After the pass, the remaining string-class hits are
code strings (selects, logs, errors, the `archive@` sender address), internal or dead
surfaces (God mode, the Guide portal, certification content, the April vault route
groups, WeChat, the cut wisdom routes), unused components nothing imports, and
non-English translations. See "Not changed" below.

Counts on the diff: 704 removed lines carried "archive"; 390 added lines carry
"Basalith"; 205 added lines carry "record." Zero em dashes on any added line (one
regex in a test that detects em dashes is unchanged). Every changed `.ts`/`.tsx`
parses clean under the TypeScript parser. CRLF line endings and BOMs preserved on
every file. `npx tsc --noEmit` in the repo has not been run from here; the five known
`lib/frozenLayer.test.ts` errors since September 10 are expected, anything else is
this pass.

### Public site (app/, marketing)

Homepage description, HomeClosing CTAs ("Begin your Basalith," "Begin a family
Basalith"), /about, /families ("A Basalith built from the person is not the same as
one built about them"), /faq (the record vs the entity question), /pricing and
PricingTiers and PricingFAQ, /method, /integrity (including the founder's own quote,
"I ran The Founding on my own Basalith"), /continuity, /security, /data-ownership,
/founding-session, /succession, /succession/demo chrome ("Checking the record,"
"Found a Basalith for the business"; persona deposits untouched), /apply, /begin
("Found your Basalith to keep it," "Already have a Basalith? Sign in"), /resume,
/asset, /posthumous-archive ("The Witness Basalith"), /archive-login eyebrow ("Your
Basalith"), /succession/login. Demo persona UI strings and the model-facing
`archiveName` values ("the Joey Marchetti record").

Two company-versus-product collisions were rewritten with "we": "You own your
Basalith. We are the custodian, not the owner."

### Legal (surgical, for counsel)

`/terms` section 01 now defines the term: *A "Basalith" is the record and the entity
built for one person or one business under this agreement.* Every "your archive"
thereafter is "your Basalith"; "archive content" is "the content of your Basalith";
section 04 "a data preservation and archival service" became "a data preservation
service." `/privacy` section 1 now reads: *We build a permanent record of human memory
for families and individuals. Each one is a Basalith: the record and the entity built
for one person or one business.* Forty-two noun swaps follow, no obligation added or
removed. **Have counsel read terms 01, 02, 04 and privacy 1 once.** "Please include
your Basalith number" in the terms closing: it is not confirmed that such a number
exists as an identifier; it was "archive number" before and was only swapped.

### Signed-in portal (app/archive/*, contribute, witness, game, successor portal)

Sidebar: nav group "Archive" is "Your Basalith"; aria-labels are "Main navigation"
and "Mobile navigation"; sign-out confirm is "Sign out?". Dashboard title "Your
Basalith." FoundingClient: "Where your record is thin, in your own words," "Call 1 is
on the record," "Checked against your record," "Where the record is silent, it says
so," "Found your Basalith to keep going." EntityClient eyebrow "Basalith" (was
"Archive Portal"), "Your entity speaks from the record," "Saved to the record."
CoverageMap "Where your record is thin." Gallery zero state "Nothing here yet,"
"Remove." Voice page heading "Voice." Preferences "Download your Basalith." Save
buttons that said "Save to Archive" / "ADD TO ARCHIVE" now say "Save this memory."
Contributor and witness pages: "Where the record is thin," "On the record,"
"Custodian." OnboardingGuide "Your Basalith is ready." MilestoneProgress "Your
progress." One banned word ("curated") dropped from DatesClient while swapping.

### Emails, phone line, generated text (lib/, app/api)

Founding welcome subject is now "The <family> Basalith is active." with "Your
Basalith sign-in link." Founding complete, reply expired ("OPEN YOUR BASALITH"), trial
warning ("Your Basalith holds N deposits from your first call. It is deleted on
<date> unless you keep it."; the archive name was dropped from that line so it never
reads "Your Basalith, Ha Basalith"), pause and resting emails ("Your Basalith is
paused"), export emails, every cron email (weekly replay "Your week on the record,"
monthly report "Your Basalith in September," gratitude note signed "The <family>
Basalith," memory game, story prompts, anniversary, cold storage ping), contributor
invites ("You have been invited to the <family> Basalith"), witness sessions, photo
sends, morning digest ("Your voice is not on the record yet"). Sender display names
"The <family> Basalith." JSON errors the UI shows: "Not found," "Your Basalith is not
active." The God-mode magic-link email a client receives: "your personal link to the
<family> Basalith," "YOUR SIGN-IN LINK."

Twilio: the recording confirmation now says "Your memory is now on the record." The
contributor greeting fallback (only when the row has no name) says "your family's
Basalith."

Default names for new rows: `lib/billing/createArchive.ts` inserts "The <family>
Basalith" and `app/api/trial/start` inserts "<family> Basalith." Existing rows keep
their names ("Dr Ha Archive" and the other three). Optional, David's call, one paste:

    update archives set name = replace(name, ' Archive', ' Basalith') where name like '% Archive';

### Model-facing prompts (gate: same-day A/B)

- `lib/entitySystemPrompt.ts`: "built from ${archiveName}, a permanent archive of
  their lifetime of deposits, decisions, and expressed values" is now "built from
  ${archiveName}, the permanent record of their deposits, decisions, and expressed
  values." The pair '(fixed in the archive. This does not change)' is now '(fixed in
  the record. This does not change)'. Nothing else in the prompt or its header
  comment changed. **Standing rule: same-day A/B on any edit to this file. Run
  `scripts/two-layer-probe.ts` before promoting.**
- `lib/verifyGrounding.ts`: the auditor prompt says "the record does not settle
  this"; the English grounding-gap reply says "in the record" instead of "in the
  archive." **This is the shipped refusal copy. Run `scripts/demo-refusal-probe.ts`
  (10/10 required) and `scripts/gap-log-probe.ts`.** The other-language gap replies
  (es, ja, tl, yue, zh) still say archive in their language.
- `lib/entityContext.ts` (personal and family entity), `lib/agents/filter.ts` and
  `quality.ts` (photo prompts; the score label is now "VALUE TO THE FAMILY"),
  `app/api/demo/entity`, `app/api/mobile/companion`, the cron letter and note
  prompts: "archive" is "the record" throughout.

Tests updated to match: `lib/emails/trialWarning.test.ts` (body line),
`lib/familyEntity.test.ts` (two gap-reply expectations).

### Rules

`CLAUDE.md` section 8 gained the vocabulary rule and lost "No Golden Dataset. Say
your archive" (now folded into it). The pitch narrative's spoken rule becomes
"Checked against the record."

## Not changed, on purpose

- Code: every identifier, route, table, bucket, key, cookie, log line, test title,
  comment. (The API agent did strip em dashes from log lines and comments in the
  files it touched, per the repo's no-em-dash rule; that is why some api diffs are
  longer than their copy change.)
- Internal and dead surfaces: `app/god`, `app/archivist/*` (Guide portal, stone slice
  4 will rewrite it), `app/api/archivist/*` except the client welcome email,
  `lib/certificationContent.ts`, `app/(auth)`, `app/(curator)`, `app/(dashboard)`,
  `app/guide-onboard`, `app/join-archivists`, WeChat, the cut wisdom and scenarios
  routes, internal founder notifications (subjects like "Trial started: Ha Archive").
- Unused components nothing imports (HeroSection, ContinuityPillar, IntelligenceLayer,
  WhatBasalithIsNot and the rest of the April set). Deleting them removes the last
  public-shaped copies of the old language from the repo.
- Non-English strings (zh, yue, ja, es, ko, vi, tl) in pauseEmails, emailTranslations,
  questionEngine, verifyGrounding gap replies, ContributeClient. Needs a translation
  pass; the two Cantonese family test rows are the only live readers.
- Tier labels `archive: 'The Archive'` in billingFunctions and legacyActivation, and
  `ARCHIVE_TIERS` in admin/checkout: dead tier keys, belong with the Stripe work.
- The download filename `basalith-archive-<id>` for exports.
- The `archive@basalith.xyz` sender address fallback (env-overridden).
- basalith.xyz (white paper) and the iOS app (`basalith-app`): separate repos, their
  own pass.
- "Our AI estimates" / "help train X's AI entity" (AI framing, not the noun) in
  story prompts, register-photo, WitnessClient: flagged, not changed.

## Verify before promote

1. `npx tsc --noEmit` (only the five known frozenLayer.test.ts errors).
2. `npx vitest run` for lib/emails/trialWarning.test.ts and lib/familyEntity.test.ts.
3. `scripts/two-layer-probe.ts`, `scripts/demo-refusal-probe.ts` (10/10),
   `scripts/gap-log-probe.ts`.
4. `vercel` preview, signed in: /, /families, /pricing, /faq, /integrity, /terms,
   /begin, /archive/dashboard, /archive/founding, /archive/entity, /succession/demo.
5. Send yourself one founding-welcome and one trial-warning email from the preview
   if the path allows; otherwise read the templates.
6. `curl -sI https://basalith.ai/archive-login` expecting 200 after deploy.
7. Decide on the SQL for the four existing row names.
