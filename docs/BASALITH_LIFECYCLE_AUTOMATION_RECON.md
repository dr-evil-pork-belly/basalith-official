# BASALITH — POST-SALE LIFECYCLE AUTOMATION (RECON)
Heritage Nexus Inc. · Recon doc, pre-build. Not a build instruction yet.
Companion to BASALITH_BUILD_CONTEXT.md and BASALITH_B2B_PIVOT_CONTEXT.md.

This is the recon artifact for the "automate everything after the human close"
goal. It defines the state model, the transitions, the automated actions, and the
exact conditions under which the machine summons a person. No code here. Skeleton
approval gate first, then build, then preview, then you promote.

---

## 0. THE FRAMING (read this before the tables)

The human touch is not a phase the archive graduates out of after the founding
fee. It is a function (trust and accountability) that recurs at a few specific
moments. So the model is not "human until onboarding, automated after." The model
is: the lifecycle runs itself, and humans are exceptions the machine knows how to
summon.

The second framing decision: do NOT model the lifecycle as one linear chain.
An archive has three independent state dimensions that move on their own clocks.
Conflating them is the design error that produces the Stevens problem (a paying,
low-maturity, stalled archive that nobody called).

The three dimensions:

1. COMMERCIAL state. Is it paid and current. (Billing reality.)
2. MATURITY state. How dense and how faithful is the archive. (Product reality.)
3. ENGAGEMENT state. Is the depositor actually depositing. (Behavior reality.)

An archive can be commercial=active, maturity=pre_echo, engagement=stalled all at
once. That exact triple is Stevens. The machine should recognize the triple and
act, not wait for a human to notice.

Escalations fire on COMBINATIONS of the three, not on any single one.

---

## 1. STATE DIMENSIONS

### 1.1 Commercial state (per subscription)

- `prospect` — lead in apply intake. Not paid. No archive provisioned yet.
- `active` — founding fee paid, subscription current.
- `past_due` — a charge failed. In dunning grace. Features still on.
- `resting` — lapsed or downgraded. Features suspended. Data preserved
  indefinitely. Never deleted for non-payment (governance policy).
- `legacy` — B2C post-death tier. Owner deposits locked. Contributor flow may
  continue. ($1,200/yr.)
- `succession_post_transition` — B2B, founder has handed off. Successor access
  tier. ($3,600/yr.)
- `pending_deletion` — explicit deletion requested with documented authority.
  12-month hold timer running.
- `deleted` — terminal. Confirmed in writing.

### 1.2 Maturity state (per archive) — TWO parts, kept separate on purpose

Part A, density milestone (existing four-stage system, drives copy):
- `pre_echo` (<10 deposits)
- `echo` (10+) — "knows who you are"
- `wisdom` (50+) — "knows how you think"
- `portrait` (200+) — "knows why you are the way you are"
- `fingerprint` (500+) — "sounds like you"

Part B, certification (boolean, eval-backed, NOT a deposit count):
- `certified: false | true` — set true only when the fidelity harness clears the
  archive against its threshold. Density is a vanity number. Certification is the
  real gate. A B2B archive is never declared ready for handoff on deposit count
  alone.

Why split them: the milestone ladder is for customer-facing progress copy. The
certified flag is for the one claim that actually matters commercially ("your
entity is faithful") and for the B2B transition gate. Different jobs, different
triggers.

### 1.3 Engagement state (per archive)

- `healthy` — depositing at or above the archive's own rolling baseline.
- `slowing` — below baseline, inside the nudge window. Automated nudge ladder runs.
- `stalled` — nudge ladder exhausted, still no deposits.
- `dormant` — stalled and deprioritized (low value, or human-rescue declined).
  No further auto-nudges beyond a slow re-engagement cron. Data kept.

Baseline is per-archive, not global. A weekly depositor and a monthly depositor
have different "slowing." Compute baseline from the archive's own history so the
sweep does not nag a healthy slow depositor or miss a fast one going quiet.

---

## 2. SEGMENT DIFFERENCES (B2C vs B2B)

The two share an engine but not a lifecycle shape.

B2C path:
prospect -> active (founding $2,500) -> depositing (owner + contributors) ->
ongoing active ($3,600/yr or $360/mo) -> on non-payment, resting ($600/yr) ->
on death, legacy ($1,200/yr). No transition event. No successor handoff.

B2B succession path:
prospect -> active (founding $5,000 + $12,000/yr) -> founder onboarding (high
touch, salesperson-framed) -> founder depositing (CDM incidents, b2b_questions,
scenarios) -> CERTIFIED (harness clears) -> TRANSITION declared (founder steps
back or acquisition closes) -> fingerprint frozen -> successor provisioned ->
succession_post_transition ($3,600/yr) -> successor consuming (grounding-verified
chat). The transition event and the certified gate are the two things B2C does
not have, and they are exactly where fidelity and accountability matter most.

B2B acquisition path:
Same as succession but the trigger is external and urgent, the engagement window
is compressed, and the price is per-deal (floor $25,000). The compressed window
means the stall-rescue clock for acquisition archives must be much shorter than
for B2C.

---

## 3. EVENTS (what the orchestrator listens for)

Stripe-sourced: `founding_fee.paid`, `subscription.renewed`, `payment.failed`,
`payment.recovered`.

Product-sourced: `deposit.created`, `milestone.crossed`, `eval.completed`
(pass/fail), `onboarding.completed`.

Human-confirmed (the accountability events, deliberately manual): `transition.declared`,
`death.recorded`, `deletion.requested`, `successor.provisioned`.

Timer/cron-sourced: `stall.detected`, `renewal.window_open`, `grace.expired`,
`deletion_hold.expired`, `nudge_ladder.exhausted`.

---

## 4. TRANSITION TABLES

Format: TRIGGER -> GUARD (must be true) -> AUTOMATED ACTION -> ESCALATION (when a
human is summoned). If the escalation column says "none," no person is involved.

### 4.1 Commercial transitions

| Trigger | Guard | Automated action | Escalation |
|---|---|---|---|
| `founding_fee.paid` | application exists | provision archive, set `active`, send framed welcome, schedule onboarding | none (the close already had a human) |
| `subscription.renewed` | state=active | extend term, log, optional milestone note | none |
| `payment.failed` | state=active | -> `past_due`, start dunning sequence | none yet |
| `payment.recovered` | state=past_due | -> `active`, stop dunning | none |
| `grace.expired` | state=past_due | -> `resting`, suspend features, preserve data, send resting notice | save call ONLY if high-value (see E6) |
| `transition.declared` | B2B, certified=true preferred | freeze fingerprint, provision successor, begin post-transition billing | human confirms the event itself |
| `death.recorded` | B2C | -> `legacy`, lock owner deposits, keep contributor flow | human/family triggered |
| `deletion.requested` | documented authority verified | -> `pending_deletion`, start 12-month hold, schedule reminders | human verifies executor authority |
| `deletion_hold.expired` | still pending_deletion | execute deletion, confirm in writing | none |

Note on transition.declared guard: if certified is false at transition time, do
NOT block the handoff (the business event is real and the founder may be leaving
regardless), but RAISE a human task flagging that the archive is handing off
uncertified, and run the eval immediately. Honesty over a clean state diagram.

### 4.2 Maturity transitions

| Trigger | Guard | Automated action | Escalation |
|---|---|---|---|
| `deposit.created` | scored, saved | recompute density, fire `milestone.crossed` if a threshold passed | none |
| `milestone.crossed` | new milestone > old | send milestone comms (integrity-checked copy), update dashboard state | none |
| `eval.completed` pass | score >= threshold | set `certified=true`, unlock the faithful-entity claim | none |
| `eval.completed` fail | score < threshold | keep `certified=false`, log failing domains | human task IF B2B near transition (E3) |

Certification eval is triggered: on demand (founder/admin), automatically when a
B2B archive crosses a density floor you set, and automatically on
`transition.declared`. B2C certification is optional and only gates the
faithful-entity marketing claim, not any handoff.

### 4.3 Engagement transitions

| Trigger | Guard | Automated action | Escalation |
|---|---|---|---|
| `stall.detected` | cadence below own baseline | -> `slowing`, start nudge ladder | none |
| nudge step 1 | slowing | gentler daily prompt (conversationalPrompts for pre-echo) | none |
| nudge step 2 | still slowing | Mirror thread question | none |
| nudge step 3 | still slowing | direct re-engagement email (replyTo token) | none |
| `nudge_ladder.exhausted` | no deposit after full ladder | -> `stalled` | E1 / E2 decision |
| deposit arrives mid-ladder | any | -> `healthy`, reset ladder | none |

The nudge ladder is the existing machinery (conversational prompts, Mirror, email
pipeline) sequenced by the orchestrator. You are wiring it, not building it.

---

## 5. ESCALATION RULES (the only places a human appears post-close)

This is the heart of the spec. Keep this list short and defend its shortness.

- E1 — STALL RESCUE (the Stevens rule). engagement=stalled AND (segment=B2B OR
  high-value tier OR maturity>=portrait). Action: open a `lifecycle_task` of type
  `rescue_call`, assigned to the owning Guide (B2C) or salesperson (B2B), with the
  archive's context attached. This converts "we forgot to call Stevens" into "the
  system told us to call exactly Stevens, and only him."

- E2 — DORMANT (the anti-Stevens, equally important). engagement=stalled AND
  low-value B2C AND maturity<portrait. Action: -> `dormant`, NO human task, keep
  data, schedule a slow re-engagement cron (monthly, not weekly). Spending human
  minutes here is the margin leak. Naming this rule explicitly is what stops the
  team from babysitting every quiet archive.

- E3 — UNCERTIFIED HANDOFF. B2B AND eval fail AND transition declared or
  imminent. Action: `lifecycle_task` type `review_fidelity`, list the failing
  cognitive domains, block the "ready" customer claim until cleared. Never tell a
  successor the judgment transferred faithfully when the harness says it did not.

- E4 — none. Dunning is fully automated. No human chases a card.

- E5 — TRANSITION CONFIRMATION. transition.declared is human-entered by design.
  This is an accountability moment (freezing a founder's judgment at a business
  handoff), so a person presses the button. The machine does everything after.

- E6 — HIGH-VALUE SAVE. grace about to expire AND high-value (succession tier,
  acquisition, or a dense B2C archive). Action: `lifecycle_task` type `save_call`
  one step BEFORE auto-resting, so a person can intervene on accounts worth
  saving. Low-value lapses rest silently.

- E7 — DEATH and E8 — DELETION AUTHORITY. Both human-confirmed. Governance
  requires documented executor authority before any post-death tier change or
  deletion. The machine runs the timers and the writing-confirmation; the human
  verifies the authority.

Everything not on this list runs with zero human involvement: scoring, training,
milestone comms, renewals, dunning, resting transitions, commission payout,
demo provisioning, certification of passing archives, re-engagement of dormant
archives.

---

## 6. THE ORCHESTRATION LAYER

Inngest is already in the stack. This is what it is for.

- Event handlers: one Inngest function per event in section 3. Each reads current
  state, applies the relevant transition, writes new state, emits follow-on events.
- Cron sweeps: `stall-sweep` (daily, computes per-archive baseline and fires
  stall.detected), `renewal-window-sweep` (daily, fires renewal.window_open and
  grace.expired), plus the existing Mirror (weekly) and daily-reflection crons,
  now treated as nudge-ladder steps the orchestrator can invoke.
- Task queue: a `lifecycle_tasks` table is the "summon a human" mechanism. Columns:
  id, archive_id, type (rescue_call / review_fidelity / save_call / authority_verify),
  status (open / done / dismissed), context_json, assignee, created_at, closed_at.
  v1 surface: the existing notification email routing (business -> David + admin;
  personal -> admin). v2 surface: a task list in /god so Guides and salespeople see
  their own queue. Build v1 first.

State storage: an `archive_lifecycle` row per archive holding commercial_state,
milestone, certified, engagement_state, baseline_cadence, and timestamps. Single
source of truth for the orchestrator. Prefer annotating this row over deleting
anything (your standing annotate-over-delete principle).

---

## 7. BUILD INVENTORY (existing vs new)

WIRE, do not build (already exists):
- daily-reflection / conversationalPrompts (nudge steps 1)
- Mirror weekly cron (nudge step 2)
- email reply pipeline (nudge step 3 + all inbound)
- Haiku scoring + Sonnet escalation (deposit.created handler)
- grounding verifier / Control B (successor chat, already live)
- fidelity eval harness (eval.completed source; baseline run 267bc741)
- CDM incident system (the capture core)
- commission computation (RESIDUAL_RATE)

BUILD (new):
1. Stripe + webhooks. The commercial state machine has no foundation without it.
   Founding fee, recurring tiers, dunning hooks, payout rails.
2. `archive_lifecycle` + `lifecycle_tasks` tables (raw SQL, you paste into
   Supabase editor per the rule, service-role policies matching
   20260502_training_pipeline.sql).
3. Inngest orchestrator: event handlers + stall-sweep + renewal-sweep.
4. Escalation task queue + notification wiring (v1 email surface).
5. Commission payout automation. GATED on the limit(50) row-count fix first.
6. Fidelity-gate wiring (eval.completed -> certified flag -> claim unlock).
7. Automated lifecycle comms (welcome, milestone, renewal, dunning, resting),
   every message passing copy rules + integrity check.

---

## 8. CONSTRAINTS ON AUTOMATED COMMS (non-negotiable)

Every automated message is rendered copy and obeys all standing rules.
- No em dashes. American English. Short declarative sentences. Legacy Guide, never
  Archivist. Locked two-line tagline only where the tagline already renders.
- Integrity: an automated email may say "your entity crossed the Wisdom Compass"
  (defined, real). It may NOT say "your archive is 80 percent complete" (no honest
  denominator). It may say "your entity is faithful" ONLY when certified=true,
  because the harness backs it. This is the leverage: the eval lets the machine
  make the quality claim without a human eyeballing every archive. The harness is
  not just QA, it is what lets certification run unattended.

---

## 9. SEQUENCE

1. Stripe + webhooks. Unblocks the entire commercial dimension and most hidden
   human labor. Priority zero.
2. Lifecycle state tables.
3. Inngest orchestrator with stall-sweep and renewal-sweep (the two escalation
   hooks that turn isolated crons into one engine).
4. Task queue + email surface.
5. Commission payout (after the row-count fix).
6. Fidelity-gate wiring.
7. Automated comms pass.

Do NOT build the tall automation tower before the CDM core is proven on one live
founder at human quality. The order is: prove one real automated CDM incident
captures judgment as well as a human interviewer, then automate the orchestration
around it. Scaling the apparatus before the core is proven just automates the
efficient production of mediocre archives.

The end-state metric to manage toward: marginal human-minutes per active archive
per month, driven to a floor you set deliberately (the budgeted rescue/save/
authority calls), not a floor you back into by accident.

---

## 10. DECISIONS NEEDED FROM YOU (before skeleton)

1. RESIDUAL RATE CONFLICT. The live code constant is RESIDUAL_RATE = 0.12 (12%),
   and EarningsClient is aligned to 12%. BUILD_CONTEXT.md still says 8%. The payout
   automation must use the true number. Confirm 12% is correct and the doc is
   stale, or the reverse. This is an integrity item, not a rounding question.
2. Stall windows per segment. Proposal to tune, not invent: acquisition 7 days
   below baseline, succession 14, active B2C 21. Set the real numbers.
3. Dunning grace before auto-resting. Proposal: 14 days, 3 emails, then resting.
   Set the real values.
4. Certification threshold. Which harness tests must pass and at what scores to
   set certified=true. Reference baseline run 267bc741.
5. Task surface for v1. Email-only to start (recommended), or jump straight to a
   /god task list.
6. Confirm transition, death, and deletion-authority stay human-confirmed
   (recommended yes; these are the accountability moments).

Answer these and the next artifact is the skeleton: table DDL, the Inngest
function signatures, and the escalation predicates as testable conditions.
