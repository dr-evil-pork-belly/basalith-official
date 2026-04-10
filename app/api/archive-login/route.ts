import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  let archiveId: string | null = null

  // ── 1. Check Supabase hashed credentials ──────────────────────────────────
  const { data: allCredentials } = await supabaseAdmin
    .from('archive_credentials')
    .select('archive_id, password_hash')
    .eq('is_active', true)

  console.log('[archive-login] Total credentials in DB:', allCredentials?.length ?? 0)
  console.log('[archive-login] Password prefix:', password.substring(0, 4) + '...')

  if (allCredentials && allCredentials.length > 0) {
    for (const cred of allCredentials) {
      console.log('[archive-login] Checking credential for archive:', cred.archive_id, '| hash prefix:', cred.password_hash.substring(0, 10))
      const matches = await bcrypt.compare(password, cred.password_hash)
      if (matches) {
        archiveId = cred.archive_id
        // Update last_used non-blocking
        supabaseAdmin
          .from('archive_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('archive_id', cred.archive_id)
          .then(() => {})
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
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // ── 3. Verify archive exists and is active ────────────────────────────────
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, status')
    .eq('id', archiveId)
    .single()

  if (!archive) {
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  }

  const cookieOptions = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  }

  const response = NextResponse.json({ success: true, archiveName: archive.name })
  response.cookies.set('archive-auth', archiveId, cookieOptions)
  response.cookies.set('archive-id',   archiveId, cookieOptions)
  return response
}
