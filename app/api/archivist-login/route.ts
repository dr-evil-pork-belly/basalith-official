import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  let password: string
  try {
    const body = await req.json()
    password = body.password
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 })
  }

  // ── Resolve archivist ID from credentials map ──────────────────────────────
  // ARCHIVIST_CREDENTIALS format: "pass1:uuid1,pass2:uuid2"
  let archivistId: string | null = null

  const credMap = process.env.ARCHIVIST_CREDENTIALS || ''
  if (credMap) {
    for (const pair of credMap.split(',')) {
      const [p, id] = pair.split(':')
      if (p?.trim() === password) { archivistId = id?.trim() ?? null; break }
    }
  }

  // Fall back to single demo credential
  if (!archivistId && password === process.env.ARCHIVIST_PASSWORD) {
    archivistId = process.env.DEMO_ARCHIVIST_ID ?? null
  }

  if (!archivistId) {
    return NextResponse.json({ success: false, error: 'Invalid password.' }, { status: 401 })
  }

  // ── Verify archivist exists ────────────────────────────────────────────────
  const { data: archivist } = await supabaseAdmin
    .from('archivists')
    .select('id, name, rank')
    .eq('id', archivistId)
    .single()

  if (!archivist) {
    return NextResponse.json({ success: false, error: 'Archivist not found.' }, { status: 404 })
  }

  const cookieOptions = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  }

  const response = NextResponse.json({
    success:       true,
    archivistName: archivist.name,
    rank:          archivist.rank,
  })
  response.cookies.set('archivist-auth', process.env.ARCHIVIST_TOKEN!, cookieOptions)
  response.cookies.set('archivist-id',   archivistId,                   cookieOptions)
  return response
}
