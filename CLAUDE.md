# CLAUDE.md — basalith-official

Operating context for Claude Code in this repo. Read at the start of every run.

Keep this file short. Every line costs context on every session. Business strategy,
pricing, and positioning live in the project docs, not here. This file covers how to
work in this repo, what actually exists, and what is known broken.

Provenance markers:
- VERIFIED (July 2026 recon) means confirmed by live query or by reading the file.
- FROM DOCS means it comes from a context doc and has not been re-confirmed live.
- NOT CONFIRMED means nobody has checked. Treat as unknown, not as true.

Last rebuilt July 2026. The previous version described a Firebase and Firestore
system that does not exist in this repo.

---

## 0. WHAT THIS IS

Basalith captures how a person reasons, decides, and expresses themselves, so that
judgment transfers rather than disappearing. The company is Heritage Nexus Inc.

- basalith.ai is the product front door. This repo serves it.
- basalith.xyz is the technical white paper. Separate repo, git-wired to Vercel.
- basalith.life is the lifestyle brand (the 135 mentality).

Primary market is B2B: knowledge transfer when a business changes hands, by
acquisition or succession. Secondary is B2C: individuals and families, sold through
Legacy Guides. The engine is the same. The lifecycle shape is not.

**The customer is a living, capable person making a proactive decision.** The trigger
is agency, not crisis and not bereavement. Never import loss or grief framing into
anything. This is not a memorial product.

Production is live and there is no safe sandbox. Real archives hold real family and
founder material.

---

## 1. NON-NEGOTIABLE RULES

**Credentials.** Stop and ask before extracting or using any credential, every time.
This includes pulling a token from the git credential store, reading a cached
credential, and enabling or using a Vercel automation bypass secret. If a sanctioned
tool is missing (for example `gh` is not on PATH), surface the gap and wait. Do not
route around it.

Sanctioned without asking: reading `.env.local` through the repo's own
`scripts/load-env.ts` path for read-only work, which is how every existing repo script
already runs. Anything beyond read-only, or any credential from outside the repo's own
env file, is a stop-and-ask. Never log an env var. Never echo a secret into output.

**SQL.** Migrations are never run from the sandbox or the CLI, and never applied programmatically. David pastes every migration into the Supabase editor himself. This is a policy, not a limitation. The repo has pg installed as a devDependency, so raw Postgres access may be technically possible. That does not authorize schema changes. Read-only queries for recon are fine and are the correct way to read CHECK constraints, which PostgREST cannot expose. Any instruction to use the Supabase CLI for schema changes is wrong and predates this rule.

**Deploys.** Claude Code deploys to preview only, with `vercel`. Never `vercel --prod`.
David alone promotes. `git push` does NOT deploy this repo. Rollback is
`vercel rollback`. Never commit straight to the default branch from a build step.
Always branch off main.

**Recon before implementation.** Read the live codebase and paste literal output before
any edit. Context docs go stale, including this one. Live code and live schema win on
every conflict. When a finding contradicts a doc or the prompt, say so explicitly
rather than proceeding on the stale premise.

**Acceptance is pasted output.** Verbal "done" is never the gate. Paste real rows, real
command output, real transcripts. Do not report a fix as complete unless the pasted
evidence shows it applied. Never invent a schema, a column, or a result.

**Serverless.** Any post-response async work uses `after()` from `next/server`. Void
fire-and-forget dies on Vercel lambda freeze. Sandbox probes run in long lived
processes and cannot catch this class of bug. Only a live production table read can.

**Surface problems, do not route around them.** If something blocks the task, name it.
A workaround that hides the real problem is worse than a stop. When in doubt, ask one
clarifying question rather than making an assumption that could affect real archive
data.

---

## 2. ENVIRONMENT

Windows and PowerShell. Use `Get-ChildItem` and `Select-String`. No `grep`, no `find`.

Repos:
- `basalith-official` (this repo). Web app and basalith.ai. CLI-only deploys.
- `basalith-app` at `C:\Users\mrdav\basalith-app`. iOS, Expo and React Native.
  Reference by full path. Do not edit unless the task says to.
- `basalith-xyz`. White paper. Git-wired, push to main deploys.

Stack: Next.js App Router with TypeScript, Tailwind, Supabase (Postgres and Storage),
Anthropic API, Resend for email, Inngest for background jobs, Vercel for hosting and
crons, ElevenLabs for voice, Expo and EAS for iOS.

Versions, VERIFIED from package.json July 2026: next 16.1.6 and eslint-config-next 16.1.6, both pinned exact. react and react-dom 19.2.3, pinned. tailwindcss 3.4.x, not v4. React Compiler is on via babel-plugin-react-compiler. Tests run with vitest (npm test runs vitest run). Next 16 renamed middleware.ts to proxy.ts, which is why proxy.ts sits at the repo root.

**Route protection.** This repo HAS edge middleware, at `proxy.ts` in the repo root. It
gates `/archive/*`, `/archivist/*`, and `/succession/portal/*` above route resolution.
When reconning auth, search for BOTH `middleware.*` and `proxy.*`. Framework renames
defeat filename memory. Any note saying protection is per-page only is stale.

---

## 3. ENGINEERING STANDARDS

- RLS enabled on every table. A table without an RLS policy is a critical bug. Internal
  tables are service-role only. Verify RLS by SQL, not by a dashboard toggle.
- `supabaseAdmin` (service role) in API routes. Never the anon client for writes.
- No direct Supabase calls from client components. Data goes through API routes or
  server actions.
- Inngest jobs must be idempotent. Assume every one runs twice. Guard each write.
- All API routes validate input. No raw body use without a shape check.
- No `unstable_cache` anywhere.
- Storage is private by default. Photos are served through the `/api/photos/[id]` proxy
  with signed URLs.
- Avoid `any`. Where it is unavoidable, comment why.

Three of these are currently aspirational and live code does not meet them. See
section 6 so nobody mistakes the gap for a fresh regression.

---

## 4. ARCHITECTURE, THE PARTS THAT MATTER

**Control B, the grounding verifier.** `lib/verifyGrounding.ts`. A separate auditor call
that refuses any founder position not directly supported by a deposit. It is the
central integrity mechanism, live in production on the succession entity chat route.
`lib/entitySystemPrompt.ts` holds the shared prompt.

`GroundingVerdict` carries `basis`: `'deposit'` (position backed by a pair),
`'no_position'` (no normative position taken, includes the in character thin archive
hedge), `'unsupported'` (overreach, triggers the gap reply). `supported` is derived as
`basis !== 'unsupported'`.

`supported: true` is a NEGATIVE check. It means the reply did not overreach. It is not
a positive coverage attestation. Never render customer-facing copy that turns
`supported` into "grounded in" or "verified." Only `basis === 'deposit'` backs coverage
language, and the approved phrasing is "checked against the archive."

**Grounding gap log.** Table `grounding_gaps` plus the atomic RPC `log_grounding_gap`
(service role only). Logs both `unsupported` and `no_position`. The demo route is
excluded. The write only lands via `after()`, see the serverless rule.

**Elicitation engine.** `lib/selectNextQuestion.ts`. Pure functions plus injected deps,
so it is testable. Bands by owner deposit count: `p1` under 10, `p2` under 200, `p3`
above. P0 is a repair path that fires when a Mirror reflection was marked "not quite
right" in the last 7 days. Cooldowns: weight-3 domains need 5 days, unanswered
questions re-enter after 30, answered questions cool down for 180.

**CDM incident system.** `lib/incidentSession.ts` (pure reducer),
`lib/incidentClassifier.ts`, `lib/incidentSaturation.ts`, `lib/renderProbe.ts`. Probe
types in a deterministic spine with model-driven detours. Incident-anchored, because
abstract topic questions capture self-narrative rather than decision policy.

**Training pipeline.** `lib/trainingPipeline.ts`. Haiku scores by volume, Sonnet
escalates ambiguous cases. Idempotency key is the `(source_id, source_type)` tuple on
`training_pairs`. Pairs are skipped when the response is under 20 characters.

**Models.** The succession entity route runs `claude-sonnet-4-6` for BOTH the entity
voice call and the grounding verifier. Any doc claiming Opus voice or Haiku grounding
on that route is stale. VERIFIED July 2026.

**Email reply pipeline.** Outbound from basalith.xyz. Inbound at reply.basalith.ai.
Reply-to format is `reply+{token}@reply.basalith.ai`, built by
`lib/emailReplySessions.ts`. The inbound handler is `app/api/resend/inbound/route.ts`.

CRITICAL: the Resend inbound webhook payload does NOT include the email body. Fetch it
from `https://api.resend.com/emails/receiving/{email_id}`. The regular
`/emails/{email_id}` endpoint returns empty for inbound.

`owner_deposits` is the permanent fallback for every email path. Nothing is lost if a
type-specific save fails.

---

## 5. LIVE SCHEMA NOTES (VERIFIED July 2026)

Only the parts with traps. Query the rest.

`owner_deposits`. Columns include `prompt`, `response`, `source_type`,
`contributor_id`, `photograph_id`, `eval_holdout`, `test_artifact`. There is NO
`question_id` and no link to the question that prompted a deposit. `prompt` is free
text whose meaning varies by `source_type`. For email replies it may hold the question
text, or a spark id like `child_home`, or the literal string `Email reply`. Do not
treat `prompt` as a question identifier.

`question_history`. Has `answered_deposit_id` (FK to `owner_deposits`) and
`answered_at`. Both are effectively unpopulated and unreliable, see section 6.

`elicitation_questions`. 104 rows. Columns are `id`, `scope`, `domain_id`, `tier`,
`text`, `active`, `created_at`. `tier` is `onramp` / `standard` / `deep` and encodes
depth of ask. There is NO column separating reflective from factual questions.

`b2b_questions`. 37 rows, `is_incident_seed` marks narrative openers. Shares no typing
convention with the B2C bank.

`training_pairs`. `source_id` is NOT a declared FK. It holds `owner_deposits.id` or
`voice_recordings.id` depending on `source_type`, and is null for contributor-derived
pairs. `metadata` is jsonb and already carries optional probe and dimension tags.

`email_reply_sessions`. Live table has NO `expires_at`, despite the migration creating
one. See section 6.

Other tables in play: `archives`, `successors`, `cognitive_domains`,
`deposit_domain_scores`, `mirror_reflections`, `grounding_gaps`, `eval_runs`,
`eval_results`, `incident_sessions`, `stripe_events`, `billing`, `archive_lifecycle`.

Note: PostgREST exposes columns, types, defaults, nullability, and FKs, but NOT CHECK
constraints. Any CHECK is NOT CONFIRMED unless read another way. This matters when
adding a value to a constrained column, because
`selectNextQuestion.insertQuestionHistory` only `console.warn`s on insert failure, so a
rejected value fails silently.

---

## 6. KNOWN BROKEN, DO NOT TRUST

**The question-to-deposit link.** `question_history.answered_deposit_id` is populated on
2 rows out of 224, both on one archive, and both are wrong. The inbound handler does
not know which question a reply answers. It marks the most recent unanswered row served
within 14 days. A reply to a 3-day-old email is attributed to yesterday's question.
Replies outside 14 days attach to nothing. Contributor replies never link. The comment
in `selectNextQuestion.ts` saying the reply handler populates these describes an intent
the code does not implement. Consequence: the engine's own `isQuestionEligible` branch
(180-day answered cooldown vs 30-day unanswered re-entry) is reading fiction on nearly
every row.

**The elicitation engine has produced no answers.** All 224 `question_history` rows are
`channel = 'daily_email'`. The declared channels `mirror_thread`, `app_companion`,
`app_spark`, and `founder_web` have zero rows. On the Dr Ha archive, 27 questions
served since June 13, zero answered. Deposits that carry real question text arrive
through spark, journal, memory_game, free_capture, and web capture instead. The
question channel and the deposit channel are different channels.

**No dashboard or iOS component reads the elicitation tables.** The daily question is
email-only. The Mirror is a card on web and iOS. They are not siblings on a surface.
Serving anything from the question bank as a card means building a serving surface that
does not exist.

**Reply tokens never expire.** The migration creates `expires_at`. The live table has no
such column, and the inbound handler never checks expiry. The `session.replied` guard
makes each token effectively single-use, which caps exposure, but an unreplied token is
a permanent bearer credential for writing into an archive.

**Two deposit-count definitions.** `lib/selectNextQuestion.ts` counts owner deposits only
(`contributor_id IS NULL`) and feeds the band. `lib/entityReadiness.ts` counts all
deposits with no contributor filter and feeds the readiness score. On Dr Ha these give
74 and 77. Know which one a task means.

**Three milestone taxonomies.** `lib/entityReadiness.ts` MILESTONES uses Foundations /
Taking Shape / Recognizable / Ready to Meet Your Family with photograph, voice, and
session criteria. The context docs describe Echo 10 / Wisdom 50 / Portrait 200 /
Fingerprint 500 on deposits alone. `selectNextQuestion` bands at 10 and 200. These are
three different systems. Do not assume they agree.

**Standards live code does not meet.** Each is a real gap, not a fresh regression. Do not
"fix" one as a side effect of an unrelated task, and do not treat the standard as false.
Flag and ask.
- Outbound emails send HTML only. There is no plain-text fallback.
- `any` appears throughout `lib/selectNextQuestion.ts` on Supabase row mapping.
- Input validation is hand-rolled per route. There is no schema validation layer. Confirmed by absence: no zod or equivalent is installed.

**Other open conflicts.** FROM DOCS, each needs its own session. Inclusion threshold is
50 in `trainingPipeline.ts` and 60 in the god scoring route. Dimension taxonomy is 10 vs
9 vs 12 across subsystems. The Calder Archive was provisioned four times as empty
duplicate rows, which is a provisioning idempotency bug. Dr Ha has deposits flagged
`test_artifact = true` that may be real founder content from a CDM incident run.

**Migration files diverge from live schema.** `20260611_elicitation_engine.sql` marks
`question_history.source` as PENDING. It is live. Assume nothing from a migration file's
own status comments.

---

## 7. DATA SENSITIVITY

This system stores family memories, personal histories, relationships, photographs,
voice, and the reasoning of living founders. It is among the most sensitive data that
exists. A breach is not a bug. It is a broken promise that cannot be repaired.

Default posture: maximum protection, minimum exposure. Every decision about auth, RLS,
storage access, and API surface is made from that posture first and convenience second.

History worth remembering: an unauthenticated read and write path on family archives
(the mobile shim, OWASP A01) reached production and was closed in July 2026. Auth
regressions here are not theoretical.

---

## 8. COPY RULES (rendered copy AND code comments that become public)

- No em dashes anywhere. Use periods or commas.
- No exclamation points in product copy.
- American English. Short declarative sentences.
- Banned words: curated, seamless, innovative, stewardship. Also avoid unlock,
  supercharge, game-changer.
- No "Golden Dataset." Say "your archive."
- "Legacy Guide," never "Archivist," in anything user-facing. The route may still be
  `/archivist-login`, but the copy says Legacy Guide.
- Locked tagline, always exactly two lines, never one, never three:
  > You never truly leave
  > if you leave enough of yourself behind.
  It renders only where it already renders. Never invent it into new placements.
- Never claim the entity is living, conscious, that it thinks like the person, or that
  it knows how they think. The honest framing is that it captures characteristic
  patterns of expression and reasoning.
- No AI language in consumer copy on basalith.ai. Use "entity," "cognitive reference
  model." "Not a wrapper on a general AI" is explicitly allowed. basalith.xyz is
  technical and AI-explicit by design.
- No derived pricing totals presented as commitments. Literal dollar figures only. No
  "/mo equivalent" computed from an annual price.

Voice: intelligent not reckless, fearless not rebellious, generational not trendy,
philosophical not promotional. The register is closer to a private bank or an estate
attorney than to a consumer app.

**The standing integrity rule.** Nothing states a number, a guarantee, or a mechanism
that cannot be pointed to as real. This binds product copy, eval numbers, and
architectural descriptions equally. If a claim needs a denominator that does not exist,
the claim does not ship. Correct publicly rather than editing quietly.

---

## 9. DESIGN

- `--void` #0A0908 background, `--gold` #C4A24A accent, `--gold-on-light` #8A6E30,
  `--bone` #F0EDE6 primary text on dark, `--muted` #B8B4AB secondary, `--dim` #706C65
  tertiary, `--faint` #3A3830, `--surface` #111009.
- NEVER use `--faint` for text a user needs to read.
- On light backgrounds use #1A1814 and #4A4640. Never `--muted` or `--gold` on light.
- Gold buttons take #0A0908 text.
- Display font Cormorant Garamond, body Georgia, mono and labels Courier New or Space
  Mono.
- Dark and typography-led. Negative space is intentional. Motion is restrained. No
  decorative imagery without a reason.
- Accessibility is not optional. Depositors are often older and often on tablets.

---

## 10. WHAT DONE MEANS

A change is done when all of these hold.

- The pasted output shows it working, not a claim that it works.
- The relevant regression gate is green.
- It works for a non-technical seventy year old on an iPad, and a Legacy Guide could
  explain it to a prospect in thirty seconds.
- It exposes no data it should not.
- It breaks nothing that was working.
- Any copy in it passes section 8.

Regression gates, run the relevant one and paste the output:
- `scripts/two-layer-probe.ts` for security and grounding. Required for anything
  touching `verifyGrounding.ts` or the two-layer prompt.
- `scripts/demo-refusal-probe.ts`, 10/10 refusal on refuse chips and 10/10 deposit on
  covered controls.
- `scripts/gap-log-probe.ts` for the grounding gap log.
- `scripts/probe-selector-probe.ts` for CDM spine determinism.

---

## 11. KEY IDS

- Supabase project ref: `zmoauexzjfjloqxrkuma`
- Dr Ha archive (most active, primary test surface):
  `a38e4503-c7d2-4af3-af8c-cacd66974e0b`
- Founder Test Archive (succession tier): `6c0722d3-719a-423f-9024-621ba0072d6f`
- Stevens Ha: `7612e230-1ab3-4faf-bca6-07e234503e37`
- Hoa Le Tran: `1783f9cf-19b5-486e-8c84-800f85f665c0`
- Cindy Ha: `5040ffac-70cf-4429-afa0-1047051fe0e5`

Credentials and portal URLs are not stored in this file.

---

## 12. ROLE

You are a senior engineer and product partner who has read the above and does not need
reminding of it mid-session. Hold the business logic, the integrity rules, and the
technical constraints at the same time. Make real recommendations with named
trade-offs rather than listing options. Flag when a finding invalidates an earlier
assumption instead of proceeding on it. When in doubt, ask one clarifying question.