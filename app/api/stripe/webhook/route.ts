/**
 * Stripe webhook — billing slice.
 *
 * Flow: read the RAW body, verify the signature with constructEvent, dedup on
 * event.id via the stripe_events ledger, then map Stripe events to lifecycle
 * Inngest events and ack 200 fast. The real provisioning work happens in the
 * Inngest function provisionOnFoundingFee, not here.
 *
 * checkout.session.completed is handled inline: it writes the billing linkage
 * from the session metadata (new model) or activates a legacy archive when a
 * pre-slice payment link carries metadata.archiveId.
 *
 * The manual activation override (x-manual-secret) is preserved from the
 * pre-slice webhook for admin/testing use.
 */
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe/client'
import { inngest } from '@/lib/inngest'
import { activateArchiveById } from '@/lib/billing/legacyActivation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── helpers ──────────────────────────────────────────────────────────────────

function idOf(v: string | { id?: string } | null | undefined): string | null {
  if (!v) return null
  return typeof v === 'string' ? v : (v.id ?? null)
}

/**
 * The subscription id has lived in different places across API versions
 * (invoice.subscription vs invoice.parent.subscription_details.subscription vs
 * the line item). Resolve defensively so the handler is version-robust.
 */
function subscriptionIdFromInvoice(invoice: any): string | null {
  return (
    idOf(invoice?.parent?.subscription_details?.subscription) ??
    idOf(invoice?.subscription) ??
    idOf(invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription) ??
    idOf(invoice?.lines?.data?.[0]?.subscription) ??
    null
  )
}

// ── checkout.session.completed (inline linkage) ──────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const md = (session.metadata ?? {}) as Record<string, string>
  const subscriptionId = idOf(session.subscription as any)
  const customerId     = idOf(session.customer as any)

  // NEW model: application-driven billing linkage.
  if (md.application_id) {
    if (!subscriptionId) {
      console.warn('[checkout.session.completed] application_id present but no subscription on session', session.id)
      return
    }
    const { data: existing } = await supabaseAdmin
      .from('billing').select('id').eq('stripe_subscription_id', subscriptionId).maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from('billing')
        .update({
          application_id:     md.application_id,
          segment:            md.segment ?? null,
          tier:               md.tier ?? null,
          stripe_customer_id: customerId,
          updated_at:         new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)
    } else {
      const { error } = await supabaseAdmin
        .from('billing')
        .insert({
          application_id:         md.application_id,
          segment:                md.segment ?? null,
          tier:                   md.tier ?? null,
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
        })
      if (error) console.error('[checkout.session.completed] billing insert failed:', error.message)
    }
    return
  }

  // LEGACY model: pre-slice payment links carrying metadata.archiveId.
  if (md.archiveId) {
    if (subscriptionId || customerId) {
      await supabaseAdmin
        .from('archives')
        .update({ stripe_subscription_id: subscriptionId, stripe_customer_id: customerId })
        .eq('id', md.archiveId)
    }
    await activateArchiveById(md.archiveId)
  }
}

// ── event router ─────────────────────────────────────────────────────────────

async function routeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      return
    }

    case 'invoice.paid': {
      const invoice = event.data.object as any
      const subscriptionId = subscriptionIdFromInvoice(invoice)
      if (!subscriptionId) return
      if (invoice.billing_reason === 'subscription_create') {
        await inngest.send({
          name: 'founding_fee.paid',
          data: { subscriptionId, customerId: idOf(invoice.customer), invoiceId: invoice.id },
        })
      } else if (invoice.billing_reason === 'subscription_cycle') {
        await inngest.send({
          name: 'subscription.renewed',
          data: { subscriptionId, invoiceId: invoice.id },
        })
      }
      return
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      const subscriptionId = subscriptionIdFromInvoice(invoice)
      if (!subscriptionId) return
      await inngest.send({
        name: 'payment.failed',
        data: { subscriptionId, invoiceId: invoice.id, hostedInvoiceUrl: invoice.hosted_invoice_url ?? '' },
      })
      return
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any
      const subscriptionId = subscriptionIdFromInvoice(invoice)
      if (!subscriptionId) return
      // Only a recovery if a prior attempt failed (first attempt counts as 1).
      if ((invoice.attempt_count ?? 0) > 1) {
        await inngest.send({
          name: 'payment.recovered',
          data: { subscriptionId, invoiceId: invoice.id },
        })
      }
      return
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await inngest.send({ name: 'subscription.canceled', data: { subscriptionId: sub.id } })
      return
    }

    default:
      // Unhandled event type — recorded in the ledger, no action.
      return
  }
}

// ── handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const raw = await req.text() // RAW body. Do not JSON.parse before verifying.

  // ── Manual activation override (admin / testing) — preserved ───────────────
  const manualSecret = req.headers.get('x-manual-secret')
  if (manualSecret && process.env.MANUAL_ACTIVATION_SECRET && manualSecret === process.env.MANUAL_ACTIVATION_SECRET) {
    try {
      const payload = JSON.parse(raw)
      if (payload._manual && payload.archiveId) {
        const result = await activateArchiveById(payload.archiveId)
        return NextResponse.json(result.json, { status: result.status })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid manual payload' }, { status: 400 })
    }
    return NextResponse.json({ error: 'archiveId required for manual activation' }, { status: 400 })
  }

  // ── Signature verification ─────────────────────────────────────────────────
  const sig    = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── Dedup ledger ───────────────────────────────────────────────────────────
  const { data: existing } = await supabaseAdmin
    .from('stripe_events').select('event_id, processed_at').eq('event_id', event.id).maybeSingle()

  if (existing?.processed_at) {
    return NextResponse.json({ received: true, deduped: true })
  }

  if (!existing) {
    const { error: insErr } = await supabaseAdmin
      .from('stripe_events')
      .insert({ event_id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> })
    if (insErr) {
      // Concurrent delivery already inserted it. If that one finished, no-op.
      const { data: race } = await supabaseAdmin
        .from('stripe_events').select('processed_at').eq('event_id', event.id).maybeSingle()
      if (race?.processed_at) return NextResponse.json({ received: true, deduped: true })
    }
  }

  // ── Route ──────────────────────────────────────────────────────────────────
  try {
    await routeEvent(event)
  } catch (err) {
    // Leave processed_at null so Stripe's retry re-runs this handler.
    console.error('[stripe/webhook] handler error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  // ── Mark processed, ack fast ───────────────────────────────────────────────
  await supabaseAdmin
    .from('stripe_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('event_id', event.id)

  return NextResponse.json({ received: true })
}
