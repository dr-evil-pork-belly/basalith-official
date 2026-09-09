import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAuthUser } from '@/lib/auth/getOrCreateAuthUser'
import { NextRequest, NextResponse } from 'next/server'

// Called by the iOS app just before it asks Supabase for a sign-in code.
//
// Owners, Legacy Guides and successors already have Supabase Auth users (the
// Phase 3 backfill and lib/billing/createArchive.ts create them). Family
// contributors were only ever reached through the emailed /contribute/{token}
// link and never got one. The app signs in with shouldCreateUser: false, so a
// contributor with no Auth user could not get past the first screen.
//
// This route provisions an Auth user for an email that is an ACTIVE contributor
// on at least one archive, and does nothing for any other email. It always
// answers 200 with the same body, so it is not an oracle for whether an address
// belongs to Basalith. (Supabase's own OTP endpoint remains the one that
// reports an unknown email, exactly as the web portal already does.)
//
// No secrets are returned and nothing is signed in here; the code still goes
// to the inbox and is still verified by Supabase Auth.

const OK = { ok: true }

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json(OK)
    }

    const { data: contributor } = await supabaseAdmin
      .from('contributors')
      .select('id')
      .eq('email', email)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (contributor) {
      // Idempotent: returns the existing user's id if one already exists.
      await getOrCreateAuthUser(email, 'contributor').catch(e => {
        console.warn('[mobile/prepare-sign-in] could not provision contributor auth user:', e instanceof Error ? e.message : e)
      })
    }

    return NextResponse.json(OK)
  } catch {
    return NextResponse.json(OK)
  }
}
