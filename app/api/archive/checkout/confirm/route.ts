import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { getStripe } from '@/lib/stripe/client'
import { notifyInternal } from '@/lib/internalNotify'
import { markTrialFounded } from '@/lib/billing/convertTrial'
import { TRIAL_CHECKOUT_SOURCE } from '@/lib/trialCheckout'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The fallback. Slice C, October 9, 2026. Owner session required.
//
// The page a payer lands on (/archive/founded) waits a minute for the Stripe
// webhook to found the record. If it has not, the page posts the Checkout
// session id here once. This route asks Stripe itself whether that session is
// paid and names this owner's record, and if so makes the same one conditional
// update the webhook would have made (markTrialFounded). Then it tells the
// founder, because a webhook that did not land in a minute is a fault to read.
//
// It exists because a person who has paid must never be left on a trial that
// the expiry job will delete. It does not link billing, send the welcome, or
// record a referral credit: those are the Inngest function's, and the notice
// says so.
//
// Nothing is taken on trust from the client. The record comes from the
// session, the payment from Stripe. A session id that is not this owner's, or
// is not paid, changes nothing and returns founded: false.

const ONE_HOUR_MS = 60 * 60 * 1000
const SESSION_ID = /^cs_[A-Za-z0-9_]{10,200}$/

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`trial-checkout-confirm:${ip}`, 6, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many tries. Please wait a while.' }, { status: 429 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, owner_email, name, status')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (archive.status === 'active') return NextResponse.json({ founded: true })
  if (archive.status !== 'trial')  return NextResponse.json({ founded: false })

  const body = (await req.json().catch(() => null)) as { sessionId?: unknown } | null
  const sessionId = typeof body?.sessionId === 'string' && SESSION_ID.test(body.sessionId) ? body.sessionId : null
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

  try {
    const checkout = await getStripe().checkout.sessions.retrieve(sessionId)
    const md = checkout.metadata ?? {}
    const mine = md.archive_id === archive.id && md.source === TRIAL_CHECKOUT_SOURCE
    if (!mine || checkout.payment_status !== 'paid') {
      return NextResponse.json({ founded: false })
    }

    const flip = await markTrialFounded(supabaseAdmin, archive.id)
    const founded = flip === 'founded' || flip === 'already_active'
    const subscription = typeof checkout.subscription === 'string' ? checkout.subscription : (checkout.subscription?.id ?? 'none')

    if (flip !== 'already_active') {
      after(async () => {
        await notifyInternal({
          subject: founded
            ? 'FOUNDED BY THE FALLBACK: the Stripe webhook did not land in a minute'
            : 'PAID, NOT FOUNDED: the fallback could not found a paid trial',
          text: [
            `Record: ${archive.id} (${archive.name ?? 'no name'})`,
            `Owner: ${archive.owner_email ?? ''}`,
            `Checkout session: ${sessionId}`,
            `Subscription: ${subscription}`,
            `Result: ${typeof flip === 'string' ? flip : `status ${flip.unexpected}`}`,
            founded
              ? 'The record is active. Billing is NOT linked and no welcome was sent unless the "Founded" notice also arrives. Check the webhook deliveries in Stripe, then send founding_fee.paid with this subscription id.'
              : 'Stripe says this owner paid. Read the record and found it by hand.',
          ].join('\n'),
        })
      })
    }

    return NextResponse.json({ founded })
  } catch (err) {
    console.error('[archive/checkout/confirm]', err instanceof Error ? err.message : err)
    return NextResponse.json({ founded: false }, { status: 502 })
  }
}
