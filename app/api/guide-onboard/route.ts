import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit, getClientIP, sanitizedError } from '@/lib/apiSecurity'
import { getOrCreateAuthUser } from '@/lib/auth/getOrCreateAuthUser'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Public, invite-code gated. Creates a new archivists row, provisions a
// Supabase Auth user for the Guide (magic-link only, no password), and
// links archivists.auth_user_id so getSessionUser resolves their portal
// scope. The client triggers the magic-link sign-in after this returns.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const limit = checkRateLimit(`guide-onboard:${ip}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const code  = typeof body.code  === 'string' ? body.code.trim()  : ''
    const name  = typeof body.name  === 'string' ? body.name.trim().slice(0, 100)  : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''

    if (!code || !name || !email) {
      return NextResponse.json({ error: 'Please fill in every field.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // ── Look up the invite ──────────────────────────────────────────────────
    const { data: invite } = await supabaseAdmin
      .from('archivist_invites')
      .select('id, status')
      .eq('code', code)
      .maybeSingle()

    if (!invite || invite.status !== 'unused') {
      return NextResponse.json({ error: 'That invite code is not valid.' }, { status: 401 })
    }

    // ── Create the Guide account ────────────────────────────────────────────
    const { data: archivist, error: insertError } = await supabaseAdmin
      .from('archivists')
      .insert({
        name,
        email,
        status: 'provisional',
        rank:   'Provisional Archivist',
      })
      .select('id, name, rank')
      .single()

    if (insertError || !archivist) {
      if (insertError?.code === '23505') {
        return NextResponse.json({ error: 'An account with this email already exists. Use the portal sign in instead.' }, { status: 409 })
      }
      return NextResponse.json({ error: sanitizedError(insertError, 'guide-onboard') }, { status: 500 })
    }

    // ── Mark the invite as used ─────────────────────────────────────────────
    await supabaseAdmin
      .from('archivist_invites')
      .update({ status: 'used', used_by: archivist.id, used_at: new Date().toISOString() })
      .eq('id', invite.id)

    // ── Provision the Guide's Supabase Auth user (magic-link only) ──────────
    const guideUserId = await getOrCreateAuthUser(email, 'guide')

    const { error: linkError } = await supabaseAdmin
      .from('archivists')
      .update({ auth_user_id: guideUserId })
      .eq('id', archivist.id)

    if (linkError) throw new Error('Failed to link Guide account: ' + linkError.message)

    return NextResponse.json({
      success:       true,
      archivistName: archivist.name,
      rank:          archivist.rank,
      email,
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizedError(err, 'guide-onboard') }, { status: 500 })
  }
}
