/**
 * Billing-slice acceptance harness (Stripe TEST mode).
 *
 * Drives real Stripe objects and posts validly-signed webhook events at the
 * running dev server, then reads back the Supabase rows. Covers skeleton §7
 * items 1-7. Requires, in separate terminals:
 *   INNGEST_DEV=1 npm run dev
 *   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest --no-discovery
 *
 * Run: npx tsx scripts/stripe-acceptance.ts
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import crypto from 'crypto'
import { getStripe, stripeMode } from '../lib/stripe/client'
import { supabaseAdmin } from '../lib/supabase-admin'
import { priceId } from '../lib/stripe/prices'
import { buildFoundingWelcomeEmail } from '../lib/emails/foundingWelcome'

const BASE_URL = process.env.ACCEPTANCE_BASE_URL ?? 'http://localhost:3000'
const WEBHOOK_URL = `${BASE_URL}/api/stripe/webhook`
const CHECKOUT_URL = `${BASE_URL}/api/admin/checkout`
const SECRET = process.env.STRIPE_WEBHOOK_SECRET!
const GOD = process.env.GOD_MODE_PASSWORD ?? process.env.CRON_SECRET ?? ''
const TAX_ENABLED = process.env.STRIPE_TAX_ENABLED === 'true'
const stripe = getStripe()

function log(section: string)  { console.log(`\n\n========== ${section} ==========`) }
function sleep(ms: number)     { return new Promise((r) => setTimeout(r, ms)) }

function makeEvent(type: string, object: any, id?: string) {
  return {
    id: id ?? `evt_acc_${crypto.randomBytes(8).toString('hex')}`,
    object: 'event',
    api_version: '2026-04-22.dahlia',
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  }
}

async function postEvent(event: any): Promise<{ status: number; body: string }> {
  const payload = JSON.stringify(event)
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body: payload,
  })
  return { status: res.status, body: await res.text() }
}

async function ensureGuide(): Promise<{ id: string; name: string }> {
  // Always create a fresh throwaway archivist so the test never pollutes a real
  // guide's commissions or closings.
  const email = `acceptance-guide+${Date.now()}@example.com`
  const { data, error } = await supabaseAdmin
    .from('archivists').insert({ name: 'Acceptance Test Guide', email, status: 'active' }).select('id, name').single()
  if (error) throw new Error('Could not create test guide: ' + error.message)
  return data
}

async function main() {
  if (stripeMode() !== 'test') throw new Error(`Refusing: stripeMode is ${stripeMode()}`)
  if (!SECRET) throw new Error('STRIPE_WEBHOOK_SECRET not set')

  log('PREFLIGHT')
  const tax: any = await stripe.tax.settings.retrieve()
  console.log('Stripe Tax account status:', tax.status, '(corp formation gates real activation)')
  console.log('STRIPE_TAX_ENABLED:', process.env.STRIPE_TAX_ENABLED ?? '(unset -> false)', '=> automatic_tax.enabled =', TAX_ENABLED)
  console.log('GOD auth configured for admin route:', GOD ? 'yes' : 'NO (admin route will 401)')

  const guide = await ensureGuide()
  console.log('Guide (archivist):', guide.id, '-', guide.name)

  // ── Test application ───────────────────────────────────────────────────────
  const stamp = Date.now()
  const ownerEmail = `founder-${stamp}@example.com`
  // subject is a bare family surname on purpose: createArchive sets the archive
  // name to "The <familyName> Archive", so a subject like "The Calder Family"
  // would double the article. (Flagged for David: confirm the family_name source.)
  const { data: application, error: appErr } = await supabaseAdmin
    .from('archive_applications')
    .insert({
      name: 'Marcus Calder',
      email: ownerEmail,
      subject: 'Calder',
      reason: 'Acceptance test application',
      referral_source: 'acceptance',
      apply_type: 'legacy',
      status: 'pending',
    })
    .select('id, email, name, subject, apply_type')
    .single()
  if (appErr || !application) throw new Error('Could not create application: ' + appErr?.message)
  console.log('Application:', application.id, '| apply_type=legacy -> segment=b2c')

  const metadata: Record<string, string> = {
    application_id: application.id,
    segment: 'b2c',
    tier: 'b2c_active',
    archive_tier: 'estate',
    family_name: 'Calder',
    guide_id: guide.id,
  }

  // ── 1a. The real admin checkout route generates a session (tax conditional) ─
  log('ITEM 1a — admin checkout route generates a session (automatic_tax from STRIPE_TAX_ENABLED)')
  const checkoutRes = await fetch(CHECKOUT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `god-mode-auth=${GOD}` },
    body: JSON.stringify({ applicationId: application.id, tierPriceName: 'b2c_active_year', guideId: guide.id, archiveTier: 'estate', familyName: 'Calder' }),
  })
  const checkoutBody: any = await checkoutRes.json().catch(() => ({}))
  console.log('admin checkout ->', checkoutRes.status, JSON.stringify(checkoutBody))
  let routeSession: any = null
  if (checkoutBody.sessionId) {
    routeSession = await stripe.checkout.sessions.retrieve(checkoutBody.sessionId, { expand: ['line_items'] })
    console.log('  url present:', !!checkoutBody.url, '| mode:', routeSession.mode, '| automatic_tax.enabled:', routeSession.automatic_tax?.enabled)
    console.log('  amount_total:', routeSession.amount_total, routeSession.currency, '| line item count:', routeSession.line_items?.data?.length)
    console.log('  session.metadata:', JSON.stringify(routeSession.metadata))
  }

  // ── 1b. Real combined charge (founding one-time + first subscription invoice)─
  log('ITEM 1b — COMBINED CHARGE (founding one-time + first subscription invoice)')
  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: 'Marcus Calder',
    address: { line1: '1 Market St', city: 'San Francisco', state: 'CA', postal_code: '94105', country: 'US' },
  })
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id })
  await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } })

  const tierPriceId = priceId('b2c_active_year')
  const foundingPriceId = priceId('b2c_founding')

  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: tierPriceId }],
    add_invoice_items: [{ price: foundingPriceId }],
    automatic_tax: { enabled: TAX_ENABLED },
    metadata,
    expand: ['latest_invoice'],
  })
  console.log('Subscription:', sub.id, '| status:', sub.status)

  const invoice: any = await stripe.invoices.retrieve(
    typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice!.id!,
    { expand: ['lines'] },
  )
  console.log('First invoice:', invoice.id, '| billing_reason:', invoice.billing_reason, '| status:', invoice.status)
  console.log('  subtotal:', invoice.subtotal, ' tax:', invoice.tax, ' total:', invoice.total, invoice.currency)
  console.log('  line items:')
  for (const l of invoice.lines.data) {
    console.log(`    - ${l.description} | amount ${l.amount} | ${l.price?.recurring ? 'recurring/' + l.price.recurring.interval : 'one-time'}`)
  }
  if (!TAX_ENABLED) console.log('  NOTE: the tax line is $0 because tax COLLECTION is OFF by config (STRIPE_TAX_ENABLED=false). This is intentional and gated on corp formation. It is not a computed $0 tax and not a misconfiguration.')

  // ── checkout.session.completed (inline billing linkage) ────────────────────
  log('ITEM 2 — checkout.session.completed -> billing linkage')
  const sessionObj = {
    id: `cs_acc_${stamp}`,
    object: 'checkout.session',
    mode: 'subscription',
    status: 'complete',
    payment_status: 'paid',
    metadata,
    subscription: sub.id,
    customer: customer.id,
  }
  const r1 = await postEvent(makeEvent('checkout.session.completed', sessionObj))
  console.log('webhook checkout.session.completed ->', r1.status, r1.body)

  // ── invoice.paid (subscription_create) -> founding_fee.paid -> provisioning ─
  log('ITEMS 2-4 — invoice.paid -> provisionOnFoundingFee')
  const paidEvent = makeEvent('invoice.paid', invoice)
  const r2 = await postEvent(paidEvent)
  console.log('webhook invoice.paid ->', r2.status, r2.body)

  // Poll for provisioning to complete.
  let billing: any = null
  for (let i = 0; i < 40; i++) {
    const { data } = await supabaseAdmin.from('billing').select('*').eq('stripe_subscription_id', sub.id).maybeSingle()
    if (data?.founding_paid_at && data?.archive_id) { billing = data; break }
    billing = data
    await sleep(1500)
  }

  console.log('\nbilling row:')
  console.log(JSON.stringify(billing, null, 2))

  const archiveId = billing?.archive_id
  const { data: lifecycle } = archiveId
    ? await supabaseAdmin.from('archive_lifecycle').select('*').eq('archive_id', archiveId).maybeSingle()
    : { data: null }
  console.log('\narchive_lifecycle row:')
  console.log(JSON.stringify(lifecycle, null, 2))

  const { data: archive } = archiveId
    ? await supabaseAdmin.from('archives').select('id, name, family_name, owner_email, tier, status, owner_user_id').eq('id', archiveId).maybeSingle()
    : { data: null }
  console.log('\narchive row:')
  console.log(JSON.stringify(archive, null, 2))

  const { data: commissions } = await supabaseAdmin
    .from('commissions').select('id, archivist_id, type, amount_cents, status, description')
    .eq('archivist_id', guide.id).eq('type', 'founding').order('created_at', { ascending: false }).limit(5)
  console.log('\nfounding commission rows for guide:')
  console.log(JSON.stringify(commissions, null, 2))

  // ── Dedup proof ────────────────────────────────────────────────────────────
  log('ITEM 5 — stripe_events dedup (replay same event)')
  const { count: commBefore } = await supabaseAdmin
    .from('commissions').select('*', { count: 'exact', head: true }).eq('archivist_id', guide.id).eq('type', 'founding')
  const r3 = await postEvent(paidEvent) // same event id
  console.log('replay invoice.paid ->', r3.status, r3.body, '(expect deduped:true)')
  await sleep(2000)
  const { count: commAfter } = await supabaseAdmin
    .from('commissions').select('*', { count: 'exact', head: true }).eq('archivist_id', guide.id).eq('type', 'founding')
  console.log(`founding commission count before replay: ${commBefore}, after: ${commAfter} (expect equal)`)

  const { data: thisEv } = await supabaseAdmin.from('stripe_events').select('event_id, type, received_at, processed_at').eq('event_id', paidEvent.id).maybeSingle()
  console.log('stripe_events row for the replayed event:')
  console.log(JSON.stringify(thisEv, null, 2))

  // ── Forced payment_failed ──────────────────────────────────────────────────
  log('ITEM 6 — forced invoice.payment_failed (emit + log-only, no state change)')
  const statusBefore = archive?.status
  const lifeBefore = lifecycle?.commercial_state
  const failInvoice = {
    id: `in_acc_fail_${stamp}`,
    object: 'invoice',
    billing_reason: 'subscription_cycle',
    customer: customer.id,
    subscription: sub.id,
    parent: { subscription_details: { subscription: sub.id } },
    hosted_invoice_url: 'https://invoice.stripe.com/acceptance-test',
    attempt_count: 1,
    status: 'open',
  }
  const r4 = await postEvent(makeEvent('invoice.payment_failed', failInvoice))
  console.log('webhook invoice.payment_failed ->', r4.status, r4.body)
  await sleep(3000)
  const { data: archiveAfter } = archiveId
    ? await supabaseAdmin.from('archives').select('status').eq('id', archiveId).maybeSingle()
    : { data: null }
  const { data: lifeAfter } = archiveId
    ? await supabaseAdmin.from('archive_lifecycle').select('commercial_state').eq('archive_id', archiveId).maybeSingle()
    : { data: null }
  console.log(`archive.status  before=${statusBefore} after=${archiveAfter?.status} (expect unchanged: active)`)
  console.log(`lifecycle.state before=${lifeBefore} after=${lifeAfter?.commercial_state} (expect unchanged: active)`)

  // ── Welcome email content ──────────────────────────────────────────────────
  log('ITEM 7 — welcome email content (copy-rule check)')
  const rendered = buildFoundingWelcomeEmail({
    familyName: archive?.family_name ?? 'Calder',
    firstName: (application.name ?? 'Marcus').split(' ')[0],
    guideName: guide.name,
    tierLabel: 'The Estate',
    magicLinkUrl: 'https://basalith.ai/api/archive/magic-login?token=SAMPLE',
    password: 'Calder2026ABCD!',
    loginUrl: 'https://basalith.ai/archive-login',
  })
  console.log('SUBJECT:', rendered.subject)
  console.log('--- TEXT ---')
  console.log(rendered.text)
  console.log('--- em dash present in subject/text? ---', /[—–]/.test(rendered.subject + rendered.text))

  log('SUMMARY')
  console.log(JSON.stringify({
    item1a_admin_route_session: checkoutBody?.sessionId ?? null,
    item1a_route_status: checkoutRes.status,
    item1a_automatic_tax_enabled: routeSession?.automatic_tax?.enabled ?? null,
    item1b_combined_charge: { invoice: invoice.id, total: invoice.total, tax: invoice.tax ?? 0, taxCollectionEnabled: TAX_ENABLED },
    item2_billing: !!(billing?.archive_id),
    item2_founding_paid_at: billing?.founding_paid_at ?? null,
    item3_lifecycle_active: lifecycle?.commercial_state === 'active',
    item4_founding_commission: (commissions ?? []).some((c: any) => c.amount_cents === 100000),
    item5_dedup_no_double_commission: commBefore === commAfter,
    item5_dedup_response: r3.body,
    item6_no_state_change: archiveAfter?.status === 'active' && (lifeAfter?.commercial_state ?? 'active') === 'active',
    item7_welcome_no_emdash: !/[—–]/.test(rendered.subject + rendered.text),
  }, null, 2))

  console.log('\nIDS:', JSON.stringify({ applicationId: application.id, customerId: customer.id, subscriptionId: sub.id, invoiceId: invoice.id, archiveId, guideId: guide.id }))
}

main().catch((e) => { console.error('\nFAILED:', e instanceof Error ? e.stack : e); process.exit(1) })
