# BASALITH — STRIPE SLICE (SKELETON)
Heritage Nexus Inc. · Build-ready skeleton. Approve before any build prompt runs.
Companion to BASALITH_STRIPE_INTEGRATION_RECON.md.

This is the executable spec for the now-slice: SQL DDL, the Stripe products and
prices, the webhook surface, and the provisioning path. It does NOT include the
E1-E8 escalation predicates. Those belong to the orchestrator skeleton that comes
after a real founder has paid. Scope held tight on purpose.

Gate after approval: SQL pasted by you into the Supabase editor, build on test
keys, preview run, pasted-output acceptance, you promote with live keys.

---

## 1. ENV AND CONFIG

Env vars (test values in preview, live values in prod env only, set by you):
- `STRIPE_SECRET_KEY` (sk_test_... in preview, sk_live_... in prod)
- `STRIPE_PUBLISHABLE_KEY` (pk_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_..., per-environment, different for test and live)

Price IDs are MODE-SPECIFIC. A test price id and a live price id differ. Keep a
resolver, not hardcoded ids scattered through the code:
- `lib/stripe/prices.ts` — maps a logical name (b2c_founding, b2c_active_year,
  b2c_active_month, succession_founding, succession_year, ...) to the price id for
  the current mode. Populate after creating products in each mode.

---

## 2. SQL DDL (paste into Supabase editor by hand)

RLS enabled, no public policies. Service role bypasses RLS, so these tables are
service-role-only, matching the internal-table convention in
`20260502_training_pipeline.sql`. Confirm the exact policy form against that file
before pasting.

```sql
-- Stripe event dedup ledger. Webhook idempotency lives here.
create table if not exists stripe_events (
  event_id     text primary key,
  type         text not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  payload      jsonb
);
alter table stripe_events enable row level security;

-- Billing linkage. Created at checkout.session.completed keyed by application,
-- archive_id filled at provisioning.
create table if not exists billing (
  id                   uuid primary key default gen_random_uuid(),
  application_id       uuid references archive_applications(id),
  archive_id           uuid,
  stripe_customer_id   text,
  stripe_subscription_id text,
  segment              text check (segment in ('b2c','succession')),
  tier                 text,
  founding_paid_at     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists billing_subscription_uniq
  on billing (stripe_subscription_id);
alter table billing enable row level security;

-- Single source of truth for archive state. Only the commercial slice is
-- populated now. Maturity/engagement/certified columns are filled by the
-- orchestrator build. Nullable on purpose.
create table if not exists archive_lifecycle (
  archive_id              uuid primary key,
  segment                 text check (segment in ('b2c','succession')),
  commercial_state        text not null default 'active'
    check (commercial_state in (
      'prospect','active','past_due','resting','legacy',
      'succession_post_transition','pending_deletion','deleted')),
  milestone               text
    check (milestone in ('pre_echo','echo','wisdom','portrait','fingerprint')),
  certified               boolean not null default false,
  engagement_state        text
    check (engagement_state in ('healthy','slowing','stalled','dormant')),
  baseline_cadence_secs   numeric,
  commercial_state_at     timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
alter table archive_lifecycle enable row level security;
```

Note: `archive_id` references the existing archives table. Confirm the real
archives table name and key by query before pasting. Do not invent it. Add the FK
constraint only after confirming the referenced column.

---

## 3. STRIPE PRODUCTS AND PRICES (test mode first)

Amounts in cents, currency usd. The plugin lets Claude Code create these via API,
or create them in the dashboard. Either way, record the resulting price ids into
`lib/stripe/prices.ts` per mode.

One-time (founding):
- Product "Basalith B2C Founding" -> price 250000, one-time. (b2c_founding)
- Product "Basalith Succession Founding" -> price 500000, one-time.
  (succession_founding)

Recurring:
- Product "Basalith B2C Active" -> two prices:
  - 360000 / year (b2c_active_year)
  - 36000 / month (b2c_active_month)
- Product "Basalith B2C Resting" -> 60000 / year (b2c_resting_year),
  6000 / month (b2c_resting_month). Created now, NOT sold at checkout.
- Product "Basalith B2C Legacy" -> 120000 / year (b2c_legacy_year). Not sold at
  checkout.
- Product "Basalith Succession" -> 1200000 / year (succession_year).
- Product "Basalith Succession Post-Transition" -> 360000 / year
  (succession_post_year). Not sold at the founder checkout; used at successor
  provisioning later.

No acquisition product. Acquisition is a manual invoice per deal.

Tax: assign each product the correct Stripe Tax product category (digital service
/ SaaS) during setup. Do not hardcode a tax rate. Stripe Tax computes it. Set the
origin address on the account. `automatic_tax.enabled = true` on the Checkout
session (section 5).

---

## 4. WEBHOOK ROUTE

`app/api/stripe/webhook/route.ts`, POST. Acks fast, processes async via Inngest.

```ts
export async function POST(req: Request): Promise<Response>
// 1. const raw = await req.text()   // RAW body. Do not JSON.parse first.
// 2. const sig = req.headers.get('stripe-signature')
// 3. event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)
//    On failure -> 400.
// 4. Dedup: insert into stripe_events (event_id, type, payload). If event_id
//    already present AND processed_at set -> return 200 immediately.
// 5. Map Stripe event -> lifecycle Inngest event(s), send to Inngest.
// 6. Set processed_at, return 200 fast. The work happens in Inngest, not here.
```

Mapping (Stripe event -> Inngest event):
- `invoice.paid`, billing_reason=subscription_create -> `founding_fee.paid`
- `invoice.paid`, billing_reason=subscription_cycle  -> `subscription.renewed`
- `invoice.payment_failed`                           -> `payment.failed`
- `invoice.payment_succeeded` after prior failure    -> `payment.recovered`
- `customer.subscription.deleted`                    -> `subscription.canceled`
- `checkout.session.completed` -> handled inline (write billing linkage from
  session metadata: application_id, segment, tier, guide_id, customer id,
  subscription id). No Inngest event needed; it is pure linkage.

---

## 5. CHECKOUT CREATION (human-initiated, admin-authed)

`app/api/admin/checkout/route.ts`, POST. Admin/god-authed only. Generates the link
the Guide or salesperson sends after the close.

```ts
// body: { applicationId: string, tierPriceName: string, billingPeriod?: 'year'|'month' }
export async function POST(req: Request): Promise<Response>
// 1. Auth: reject non-admin.
// 2. Load application. Derive segment from apply_type. Derive guide_id from
//    application.assigned_archivist.
// 3. Resolve foundingPriceId (b2c_founding | succession_founding) and the
//    recurring tier price id from lib/stripe/prices.ts.
// 4. Create Checkout session:
//    mode: 'subscription'
//    line_items: [ { price: tierPriceId, quantity: 1 },
//                  { price: foundingPriceId, quantity: 1 } ]  // one-time on first invoice
//    automatic_tax: { enabled: true }
//    metadata + subscription_data.metadata: { application_id, segment, tier, guide_id }
//    customer_email: application.email
// 5. Return session.url.
```

VERIFY AT BUILD (the plugin is for exactly this): that a one-time price as a
line_item in `mode: 'subscription'` is charged on the first invoice. If Stripe
requires a different shape (invoice item on the first invoice instead), adjust.
Confirm against live docs, do not assume.

Put `application_id` in BOTH session metadata and subscription_data.metadata, so
both the checkout.session.completed event and later subscription invoices can
resolve the application.

---

## 6. INNGEST FUNCTIONS

`provisionOnFoundingFee` is the only one that does real work this slice. The rest
are named log-only stubs so the orchestrator build has the surface to fill.

```ts
// event: 'founding_fee.paid'  ({ subscriptionId, customerId, applicationId })
provisionOnFoundingFee
// IDEMPOTENT. Re-running on a duplicate event is a no-op.
// 1. Load billing row by subscriptionId. Load application by applicationId.
// 2. If archive_lifecycle already active for this archive -> stop (already done).
// 3. Create or link the archive. Write billing.archive_id, billing.founding_paid_at.
// 4. Upsert archive_lifecycle: archive_id, segment, commercial_state='active'.
// 5. If segment='b2c' AND guide_id present AND no founding commission row exists
//    for this archive: insert founding commission (amount_cents 100000, type
//    'founding') via the existing fixed insert path. On insert failure, surface
//    into the admin notification (existing pattern). Do not fail the whole
//    provision on a commission-insert miss; log and escalate it.
// 6. Send framed welcome (integrity-checked copy). Schedule onboarding.
// 7. Mark application status won/closed.

// event: 'subscription.renewed'   -> recordRenewal: extend term, log. Minimal.
// event: 'payment.failed'         -> logPaymentFailed: log only. No dunning yet.
// event: 'payment.recovered'      -> logPaymentRecovered: log only.
// event: 'subscription.canceled'  -> logSubscriptionCanceled: log only.
```

Every write in step 3 to 7 is guarded so a duplicate event cannot double-provision,
double-commission, or double-send the welcome. The unique index on
billing.stripe_subscription_id and the archive_lifecycle primary key are the
backstops; the explicit checks are the front line.

---

## 7. TEST PLAN AND ACCEPTANCE GATE

Preview, Stripe test mode. Use the Stripe CLI to forward and replay events so you
test handlers without waiting on real charges.

Run and paste back as the acceptance gate:
1. Successful combined charge (test card) for a b2c application: the founding fee
   plus the first subscription invoice, tax line present.
2. The `billing` row (customer + subscription ids, archive_id linked,
   founding_paid_at set).
3. The `archive_lifecycle` row at commercial_state='active'.
4. The founding commission row (amount_cents 100000).
5. The `stripe_events` rows showing dedup (replay the same event, confirm the
   second run is a no-op).
6. A forced `invoice.payment_failed`: confirm `payment.failed` is emitted and the
   log-only stub ran. No dunning, no state change. That is correct.
7. The welcome email content, checked against copy rules.

Verbal "done" is not the gate. Pasted rows and a test-mode charge screenshot are.

---

## 8. BUILD ORDER FOR CLAUDE CODE

1. Paste the SQL (you), after confirming the archives table name/key by query.
2. Install the Stripe plugin. Work on sandbox keys for everything below.
3. Create products and prices in test mode. Record ids into lib/stripe/prices.ts.
4. Webhook route: raw body, signature verify, dedup ledger, event mapping. Ack 200.
5. checkout.session.completed linkage handler.
6. Admin checkout-session route (verify the one-time-line-item shape here).
7. Inngest provisionOnFoundingFee (idempotent) + the four log-only stubs.
8. Welcome comms (copy-rule checked).
9. Full preview test run. Paste the acceptance output.
10. You promote. Live keys and live webhook secret into prod env only. Claude Code
    never sees sk_live_.

After one real founder pays and provisions cleanly, the next artifact is the
orchestrator skeleton: the remaining archive_lifecycle columns put to work, the
stall-sweep and renewal-sweep crons, and E1-E8 as testable predicates.
