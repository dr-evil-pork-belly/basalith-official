import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://basalith.ai'

// Same key, same apiVersion, same lazy construction as before. The only change
// is a top-level ESM import in place of an inline require, matching
// lib/stripe/client.ts. The client is still built on call, not at module load,
// so importing this route without STRIPE_SECRET_KEY set still does not throw.
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

// POST: initiate Stripe Connect onboarding for the signed-in Legacy Guide.
//
// Auth: Supabase Guide session only, matching app/api/archivist/dashboard.
// The archivist id comes from the session and the request body is not read at
// all. It is not cross-checked against the session either: a route that compares
// a caller-supplied id to the session and errors on a mismatch tells the caller
// whether that id is a real archivist, which is the thing worth hiding here.
// SettingsClient.tsx still posts { archivistId }. That field is now dead weight
// on the wire and changes nothing about which row is touched.
export async function POST() {
  const session = await getSessionUser()
  if (!session?.archivistId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archivistId = session.archivistId

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
      // archivistId is deliberately absent from the return URL. The GET below
      // resolves the Guide from their session, so passing it here would only
      // put an internal id in a URL that Stripe logs and the browser keeps.
      return_url:  `${BASE_URL}/api/archivist/connect-stripe/callback?account=${account.id}`,
      type:        'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('[connect-stripe]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to initiate Stripe Connect' }, { status: 500 })
  }
}

// GET: return leg after the Guide completes Stripe onboarding.
//
// Auth: the same Guide session. This is a top-level browser navigation, so an
// unauthenticated caller is redirected to sign in rather than handed a 401 JSON
// body. The archivist id is never read from the query string.
//
// The account id still arrives as a parameter because Stripe puts it there, so
// it is verified rather than trusted: the account was created above with
// metadata.archivistId, and that has to match the session. Without this a Guide
// could point their own row at another Guide's connected account, which is the
// same class of hole the session check closes on the POST.
export async function GET(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archivistId) {
    return NextResponse.redirect(`${BASE_URL}/archivist-login`)
  }
  const archivistId = session.archivistId

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account')

  if (!accountId) {
    return NextResponse.redirect(`${BASE_URL}/archivist/settings?error=missing_params`)
  }

  try {
    const stripe  = getStripe()
    const account = await stripe.accounts.retrieve(accountId)

    if (account?.metadata?.archivistId !== archivistId) {
      console.warn('[connect-stripe callback] account does not belong to the session Guide')
      return NextResponse.redirect(`${BASE_URL}/archivist/settings?error=stripe_account_mismatch`)
    }

    const status = account.charges_enabled ? 'active' : 'pending'

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
