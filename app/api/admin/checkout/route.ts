/**
 * Admin checkout-session creator. God-authed. Generates the payment link a
 * Legacy Guide or salesperson sends after the close. Not public, not self-serve.
 *
 * One combined subscription-mode session charges the founding fee (one-time)
 * and starts the recurring tier on the first invoice. Verified against Stripe
 * docs: a one-time price as a line_item in mode 'subscription' is charged on the
 * first invoice, so no separate invoice item is needed.
 *
 * Metadata is threaded into BOTH session.metadata (for checkout.session.completed)
 * and subscription_data.metadata (so the subscription and its invoices carry it,
 * which is what provisionOnFoundingFee reads).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getGodModeAuth } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe/client'
import { priceId, type PriceName } from '@/lib/stripe/prices'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Segment = 'b2c' | 'succession'

// apply_type -> segment. acquisition is a manual invoice (no checkout).
function segmentForApplyType(applyType: string): Segment | 'acquisition' | null {
  if (applyType === 'legacy') return 'b2c'
  if (applyType === 'succession') return 'succession'
  if (applyType === 'acquisition') return 'acquisition'
  return null
}

// Recurring tiers sellable at the founder checkout (resting/legacy/post are not).
const SELLABLE_TIERS: Record<Segment, PriceName[]> = {
  b2c:        ['b2c_active_year', 'b2c_active_month'],
  succession: ['succession_year'],
}

const ARCHIVE_TIERS = ['archive', 'estate', 'dynasty'] as const

// Resolve the recurring tier price name from the request, allowing a base name
// ('b2c_active' | 'succession') plus billingPeriod, or a full PriceName.
function resolveTierName(
  raw: string,
  billingPeriod: 'year' | 'month' | undefined,
  segment: Segment,
): PriceName | null {
  const period = billingPeriod ?? 'year'
  const full = SELLABLE_TIERS[segment]
  if ((full as string[]).includes(raw)) return raw as PriceName
  if (segment === 'b2c' && raw === 'b2c_active') return period === 'month' ? 'b2c_active_month' : 'b2c_active_year'
  if (segment === 'succession' && raw === 'succession') return 'succession_year'
  return null
}

// Tier billing-SKU label stored in metadata.tier / billing.tier.
function skuBase(tierName: PriceName): string {
  if (tierName.startsWith('b2c_active')) return 'b2c_active'
  if (tierName.startsWith('succession')) return 'succession'
  return tierName
}

export async function POST(req: NextRequest) {
  if (!getGodModeAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    applicationId?: string
    tierPriceName?: string
    billingPeriod?: 'year' | 'month'
    guideId?: string
    archiveTier?: string
    familyName?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { applicationId, tierPriceName, billingPeriod, guideId, archiveTier } = body
  const familyName = typeof body.familyName === 'string' ? body.familyName.trim() : ''

  // ── Validate input ─────────────────────────────────────────────────────────
  if (!applicationId || typeof applicationId !== 'string') {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
  }
  if (!tierPriceName || typeof tierPriceName !== 'string') {
    return NextResponse.json({ error: 'tierPriceName is required' }, { status: 400 })
  }
  // The application has no reliable family-name field (subject holds relationship
  // answers like "A parent"), so the human generating the link supplies it.
  // No silent default, no deriving from the application.
  if (!familyName) {
    return NextResponse.json({ error: 'familyName is required' }, { status: 400 })
  }
  if (billingPeriod && billingPeriod !== 'year' && billingPeriod !== 'month') {
    return NextResponse.json({ error: "billingPeriod must be 'year' or 'month'" }, { status: 400 })
  }
  if (archiveTier && !(ARCHIVE_TIERS as readonly string[]).includes(archiveTier)) {
    return NextResponse.json({ error: `archiveTier must be one of ${ARCHIVE_TIERS.join(', ')}` }, { status: 400 })
  }

  // ── Load application, derive segment ───────────────────────────────────────
  const { data: application, error: appErr } = await supabaseAdmin
    .from('archive_applications')
    .select('id, email, apply_type')
    .eq('id', applicationId)
    .maybeSingle()

  if (appErr || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }
  if (!application.email) {
    return NextResponse.json({ error: 'Application has no email' }, { status: 422 })
  }

  const segment = segmentForApplyType(application.apply_type)
  if (segment === 'acquisition') {
    return NextResponse.json(
      { error: 'Acquisition deals are billed by manual invoice, not checkout' },
      { status: 422 },
    )
  }
  if (!segment) {
    return NextResponse.json({ error: `Unsupported apply_type: ${application.apply_type}` }, { status: 422 })
  }

  // ── Resolve prices ─────────────────────────────────────────────────────────
  const tierName = resolveTierName(tierPriceName, billingPeriod, segment)
  if (!tierName) {
    return NextResponse.json(
      { error: `tierPriceName '${tierPriceName}' is not sellable for segment '${segment}'` },
      { status: 400 },
    )
  }
  const foundingName: PriceName = segment === 'succession' ? 'succession_founding' : 'b2c_founding'

  let tierPriceId: string
  let foundingPriceId: string
  try {
    tierPriceId     = priceId(tierName)
    foundingPriceId = priceId(foundingName)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Price not configured' }, { status: 500 })
  }

  // ── Optionally verify the guide exists (commission needs a real archivist) ──
  if (guideId) {
    const { data: guide } = await supabaseAdmin
      .from('archivists').select('id').eq('id', guideId).maybeSingle()
    if (!guide) {
      return NextResponse.json({ error: `guideId '${guideId}' is not a known archivist` }, { status: 422 })
    }
  }

  // ── Metadata threaded into session + subscription ──────────────────────────
  const metadata: Record<string, string> = {
    application_id: applicationId,
    segment,
    tier:           skuBase(tierName),
    archive_tier:   archiveTier ?? 'estate',
    family_name:    familyName,
  }
  if (guideId) metadata.guide_id = guideId

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'

  // Tax collection is gated on corp formation plus Stripe Tax activation, then
  // flipped via STRIPE_TAX_ENABLED=true in the prod env. No code change is needed
  // to enable it later. Defaults OFF: enabling it before Stripe Tax is active
  // makes session creation error.
  const taxEnabled = process.env.STRIPE_TAX_ENABLED === 'true'

  // ── Create the combined Checkout session ───────────────────────────────────
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        { price: tierPriceId, quantity: 1 },      // recurring tier
        { price: foundingPriceId, quantity: 1 },  // one-time founding, on first invoice
      ],
      automatic_tax: { enabled: taxEnabled },
      customer_email: application.email,
      metadata,
      subscription_data: { metadata },
      success_url: `${siteUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/`,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (e) {
    console.error('[admin/checkout] session create failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
