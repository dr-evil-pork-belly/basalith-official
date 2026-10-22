import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { getStripe } from '@/lib/stripe/client'
import { priceId } from '@/lib/stripe/prices'
import { notifyInternal } from '@/lib/internalNotify'
import {
  checkoutRefusal,
  isBillingPeriod,
  trialCheckoutMetadata,
  trialCheckoutPlan,
} from '@/lib/trialCheckout'
import { checkoutOpenForOwner, loadTrialApplication } from '@/lib/trialCheckoutStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Trial to paid. Slice C, October 9, 2026. Owner session required.
//
// POST creates the Stripe Checkout session for the caller's own trial record
// and returns its url. The record comes from the session, never the client.
// The session carries `archive_id` in its metadata, which is what makes the
// payment found THIS record (lib/billing/convertTrial.ts) and not create a
// new one. The admin route (app/api/admin/checkout) is unchanged and still
// serves succession and anyone the founder sets up by hand.
//
// Same shape as the admin session: one subscription mode session with the
// recurring plan and the one time founding fee on the first invoice. Tax
// follows the same STRIPE_TAX_ENABLED switch.
//
// GET answers one question for the page a payer lands on: is my record
// founded yet. It reads the caller's own row and returns the status word.
//
// Who sees a button is decided by TRIAL_CHECKOUT (lib/trialCheckout.ts,
// checkoutOpenFor). This route applies the same rule, so a hand made request
// cannot open Checkout where the page would not.

const ONE_HOUR_MS = 60 * 60 * 1000

const ARCHIVE_COLS = 'id, owner_user_id, owner_email, owner_name, name, tier, status, scheduled_deletion_at, termination_requested_at'

type OwnedArchive = {
  id: string
  owner_user_id: string | null
  owner_email: string | null
  owner_name: string | null
  name: string | null
  tier: string | null
  status: string | null
  scheduled_deletion_at: string | null
  termination_requested_at: string | null
}

async function ownedArchive(): Promise<{ archive: OwnedArchive } | { response: NextResponse }> {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data } = await supabaseAdmin
    .from('archives')
    .select(ARCHIVE_COLS)
    .eq('id', session.archiveId)
    .maybeSingle()
  const archive = (data ?? null) as OwnedArchive | null
  if (!archive || archive.owner_user_id !== session.userId) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { archive }
}

export async function GET() {
  const owned = await ownedArchive()
  if ('response' in owned) return owned.response
  return NextResponse.json({ status: owned.archive.status, founded: owned.archive.status === 'active' })
}

export async function POST(req: NextRequest) {
  const owned = await ownedArchive()
  if ('response' in owned) return owned.response
  const { archive } = owned

  // In memory per instance: a cost guard on Stripe calls, not a security
  // control. The session and the ownership check above are the gate.
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`trial-checkout:${ip}`, 10, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many tries. Please wait a while.' }, { status: 429 })
  }

  const refusal = checkoutRefusal(archive)
  if (refusal) return NextResponse.json({ error: refusal.error }, { status: refusal.status })

  if (!checkoutOpenForOwner(archive.owner_email)) {
    return NextResponse.json({ error: 'Payment is not open yet. Write to us and we will set it up with you.' }, { status: 503 })
  }
  if (!archive.owner_email) {
    return NextResponse.json({ error: 'Your Basalith has no email on it. Write to us and we will fix it.' }, { status: 422 })
  }

  const body = (await req.json().catch(() => null)) as { billingPeriod?: unknown } | null
  if (!body || !isBillingPeriod(body.billingPeriod)) {
    return NextResponse.json({ error: "billingPeriod must be 'year' or 'month'" }, { status: 400 })
  }
  const billingPeriod = body.billingPeriod

  // The same read the page made to decide what to print (loadTrialOffer), so
  // what is charged is what was shown.
  const application = await loadTrialApplication(archive.owner_email, archive.id)
  const referrerArchiveId = application.referrerArchiveId
  const plan = trialCheckoutPlan({ billingPeriod, referrerArchiveId })

  let tierPriceId: string
  let foundingPriceId: string
  try {
    tierPriceId     = priceId(plan.tierPrice)
    foundingPriceId = priceId(plan.foundingPrice)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Price not configured'
    console.error('[archive/checkout] price lookup failed:', message)
    after(async () => {
      await notifyInternal({
        subject: 'Checkout refused: a Stripe price is missing',
        text:    [`Record: ${archive.id}`, `Owner: ${archive.owner_email}`, message].join('\n'),
      })
    })
    return NextResponse.json({ error: 'Payment is not open yet. Write to us and we will set it up with you.' }, { status: 503 })
  }

  const metadata = trialCheckoutMetadata({
    archiveId:     archive.id,
    billingPeriod,
    applicationId: application.id,
    referrerArchiveId,
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
  // Off until corp formation and Stripe Tax activation, exactly as on the
  // admin route. Turning it on before Stripe Tax is active makes session
  // creation fail.
  const taxEnabled = process.env.STRIPE_TAX_ENABLED === 'true'

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        { price: tierPriceId, quantity: 1 },      // the plan
        { price: foundingPriceId, quantity: 1 },  // the founding, once, on the first invoice
      ],
      automatic_tax: { enabled: taxEnabled },
      customer_email: archive.owner_email,
      client_reference_id: archive.id,
      metadata,
      subscription_data: { metadata },
      success_url: `${siteUrl}/archive/founded?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/archive/founding`,
    })
    if (!session.url) throw new Error('Stripe returned a session with no url')

    after(async () => {
      await notifyInternal({
        subject: `Checkout opened: ${archive.name ?? archive.owner_email}`,
        text: [
          `Owner: ${archive.owner_name ?? ''} <${archive.owner_email}>`,
          `Record: ${archive.id}`,
          `Plan: ${billingPeriod === 'month' ? 'monthly' : 'yearly'}`,
          `Founding fee: ${plan.referred ? 'half, by referral' : 'list'}`,
          'They have reached the Stripe page. Nothing is paid yet.',
        ].join('\n'),
      })
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[archive/checkout] session create failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not open the payment page. Please try again in a moment.' }, { status: 500 })
  }
}
