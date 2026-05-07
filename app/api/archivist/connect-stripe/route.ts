import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://basalith.xyz'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StripeLib = require('stripe')
  return new StripeLib(key, { apiVersion: '2026-04-22.dahlia' })
}

// POST — initiate Stripe Connect OAuth
export async function POST(req: NextRequest) {
  const { archivistId } = await req.json()
  if (!archivistId) return NextResponse.json({ error: 'archivistId required' }, { status: 400 })

  const { data: archivist } = await supabaseAdmin
    .from('archivists')
    .select('id, email, name')
    .eq('id', archivistId)
    .single()

  if (!archivist) return NextResponse.json({ error: 'Archivist not found' }, { status: 404 })

  try {
    const stripe = getStripe()
    // Create Stripe Connect account link
    const account = await stripe.accounts.create({
      type:                'express',
      email:               archivist.email,
      capabilities:        { transfers: { requested: true } },
      business_profile:    { name: archivist.name ?? undefined },
      metadata:            { archivistId },
    })

    // Save account ID immediately
    await supabaseAdmin
      .from('archivists')
      .update({ stripe_account_id: account.id, stripe_account_status: 'pending' })
      .eq('id', archivistId)

    const accountLink = await stripe.accountLinks.create({
      account:     account.id,
      refresh_url: `${BASE_URL}/archivist/settings?stripe_refresh=1`,
      return_url:  `${BASE_URL}/api/archivist/connect-stripe/callback?account=${account.id}&archivistId=${archivistId}`,
      type:        'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('[connect-stripe]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to initiate Stripe Connect' }, { status: 500 })
  }
}

// GET — OAuth callback (after guide completes Stripe onboarding)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accountId        = searchParams.get('account')
  const archivistId      = searchParams.get('archivistId')

  if (!accountId || !archivistId) {
    return NextResponse.redirect(`${BASE_URL}/archivist/settings?error=missing_params`)
  }

  try {
    const stripe  = getStripe()
    const account = await stripe.accounts.retrieve(accountId)
    const status  = account.charges_enabled ? 'active' : 'pending'

    await supabaseAdmin
      .from('archivists')
      .update({ stripe_account_id: accountId, stripe_account_status: status })
      .eq('id', archivistId)

    return NextResponse.redirect(`${BASE_URL}/archivist/settings?stripe_connected=1`)
  } catch (err) {
    console.error('[connect-stripe callback]', err instanceof Error ? err.message : err)
    return NextResponse.redirect(`${BASE_URL}/archivist/settings?error=stripe_error`)
  }
}
