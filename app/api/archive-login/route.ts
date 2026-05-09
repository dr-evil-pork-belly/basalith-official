import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'

export async function POST(req: NextRequest) {
  // ── Rate limiting — max 10 attempts per IP per 15 minutes ─────────────────
  const ip    = getClientIP(req)
  const limit = checkRateLimit(`archive-login:${ip}`, 10, 15 * 60 * 1000)

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429 }
    )
  }

  let password: string
  try {
    const body = await req.json()
    password   = body.password
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  let archiveId: string | null = null

  // ── 1. Check Supabase hashed credentials ──────────────────────────────────
  const { data: allCredentials } = await supabaseAdmin
    .from('archive_credentials')
    .select('archive_id, password_hash')
    .eq('is_active', true)

  if (allCredentials?.length) {
    for (const cred of allCredentials) {
      const matches = await bcrypt.compare(password, cred.password_hash)
      if (matches) {
        archiveId = cred.archive_id
        // Update last_used — non-blocking
        void supabaseAdmin
          .from('archive_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('archive_id', cred.archive_id)
        break
      }
    }
  }

  // ── 2. Fall back to env var credentials ───────────────────────────────────
  if (!archiveId) {
    const credMap = process.env.ARCHIVE_CREDENTIALS || ''
    if (credMap) {
      for (const pair of credMap.split(',')) {
        const [p, id] = pair.split(':')
        if (p?.trim() === password) { archiveId = id?.trim() ?? null; break }
      }
    }
    if (!archiveId && password === process.env.ARCHIVE_PASSWORD) {
      archiveId = process.env.DEMO_ARCHIVE_ID ?? null
    }
  }

  if (!archiveId) {
    // Generic message — don't reveal whether ID or password was wrong
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // ── 3. Verify archive is active ────────────────────────────────────────────
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, status, preferred_language')
    .eq('id', archiveId)
    .single()

  if (!archive || (archive.status && archive.status !== 'active')) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const cookieOptions = {
    httpOnly: true,
    secure:   true,            // always — even in dev; mirrors prod behaviour
    sameSite: 'strict' as const,
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     '/',
  }

  const response = NextResponse.json({ success: true, archiveName: archive.name })
  response.cookies.set('archive-auth', archiveId, cookieOptions)
  response.cookies.set('archive-id',   archiveId, cookieOptions)

  if (archive.preferred_language && archive.preferred_language !== 'en') {
    response.cookies.set('lang', archive.preferred_language, {
      httpOnly: false,
      secure:   true,
      sameSite: 'strict' as const,
      maxAge:   60 * 60 * 24 * 365,
      path:     '/',
    })
  }

  return response
}
