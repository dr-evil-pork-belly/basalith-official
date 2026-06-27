# TO MERGE INTO BASALITH_BUILD_CONTEXT.md AT PROMOTION

Two edits. The first is a new section. The second is a one-line correction to an
existing section. Do both in the same pass when the Stripe slice goes live, so the
permanent context stops disagreeing with the running code.

This file is scaffolding. Once the section below is pasted into BUILD_CONTEXT.md
and the residual line is fixed, delete or archive this file and the three Stripe
specs (integration recon, skeleton, and this). What stays current is
BUILD_CONTEXT.md.

Before pasting, fill the two blanks marked CONFIRM. Do not invent them.

---

## NEW SECTION (paste into BUILD_CONTEXT.md)

### BILLING (Stripe)

Billing runs on Stripe. Checkout is HUMAN-INITIATED: the Guide (B2C) or
salesperson (B2B) generates a payment link for an approved application after the
close. It is not public self-serve. The pricing page stays informational. The link
comes from the human close.

One combined Checkout session (subscription mode) charges the founding fee
(one-time) and starts the recurring tier in a single payment. Metadata threads
application_id, segment, tier, and guide_id (from application.assigned_archivist)
so the webhook can provision context-free.

Acquisition is NOT a Stripe product. It is a manual invoice per deal, floor
$25,000, scaled in conversation. No Checkout, no Price object, no published number
beyond the floor.

The webhook (`app/api/stripe/webhook/route.ts`) acks fast and processes async via
Inngest. It reads the RAW request body for signature verification, dedupes on
event.id via the stripe_events ledger, then sends lifecycle Inngest events.
Provisioning happens in the Inngest function `provisionOnFoundingFee` (idempotent),
not in the webhook handler.

Sales tax: Stripe Tax is enabled. `automatic_tax.enabled = true` on the session;
origin address and per-product tax category set in the dashboard. Stripe computes
rates. No hardcoded rates anywhere. NOTE: Stripe Tax calculates and collects;
filing and remittance to states is a separate step, deferred until there is real
revenue to file against. Revisit before that revenue exists. Hand remittance to an
accountant, do not self-learn it.

Keys: live keys (sk_live_, live whsec_) live ONLY in the Vercel prod environment,
set by David. Claude Code never sees live keys and builds entirely on test keys.

Tables:
- `stripe_events` — webhook idempotency ledger. event_id (pk), type, received_at,
  processed_at, payload.
- `billing` — Stripe linkage. application_id, archive_id, stripe_customer_id,
  stripe_subscription_id, segment, tier, founding_paid_at. Unique index on
  stripe_subscription_id.
- `archive_lifecycle` — single source of truth for archive state. The commercial
  slice (commercial_state) is live now. The milestone, certified, engagement_state,
  and baseline_cadence_secs columns are filled by the orchestrator build, not this
  slice. FK archive_id -> [CONFIRM: real archives table name/key].

Price resolver: `lib/stripe/prices.ts` maps logical names (b2c_founding,
b2c_active_year, b2c_active_month, succession_founding, succession_year, ...) to
mode-specific price ids. Test and live price ids differ.
[CONFIRM: live price ids once products are created in live mode.]

Deferred (events emitted now, consumers built later with the orchestrator):
dunning sequences, auto-resting on grace expiry, commission PAYOUT (the founding
commission ROW is created at provisioning; payout is gated on the limit(50)
row-count fix). payment.failed, payment.recovered, and subscription.canceled are
emitted and logged only until the orchestrator consumes them.

---

## ONE-LINE CORRECTION (existing PRICING section)

The PRICING section lists the Legacy Guide residual as 8%. That is STALE. The live
code constant is RESIDUAL_RATE = 0.12 and EarningsClient is aligned to 12%. Change
the residual figure from 8% to 12% so the doc matches the running code. This is an
integrity fix, not a rounding change: payout automation reads the true number.
