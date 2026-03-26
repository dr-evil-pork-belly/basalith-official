import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  // ── Resolve archive ID from credentials map ────────────────────────────────
  // ARCHIVE_CREDENTIALS format: "pass1:uuid1,pass2:uuid2"
  let archiveId: string | null = null

  const credMap = process.env.ARCHIVE_CREDENTIALS || ''
  if (credMap) {
    for (const pair of credMap.split(',')) {
      const [p, id] = pair.split(':')
      if (p?.trim() === password) { archiveId = id?.trim() ?? null; break }
    }
  }

  // Fall back to single demo credential
  if (!archiveId && password === process.env.ARCHIVE_PASSWORD) {
    archiveId = process.env.DEMO_ARCHIVE_ID ?? null
  }

  if (!archiveId) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // ── Verify archive exists ──────────────────────────────────────────────────
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name')
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
  response.cookies.set('archive-auth', process.env.ARCHIVE_TOKEN!, cookieOptions)
  response.cookies.set('archive-id',   archiveId,                   cookieOptions)
  return response
}
