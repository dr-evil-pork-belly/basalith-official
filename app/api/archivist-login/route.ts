import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'

export async function POST(req: NextRequest) {
  // ── Rate limiting ───────────────────────────────────────────────────────────
  const ip    = getClientIP(req)
  const limit = checkRateLimit(`archivist-login:${ip}`, 10, 15 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

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
    secure:   true,
    sameSite: 'strict' as const,
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     '/',
  }

  const response = NextResponse.json({
    success:       true,
    archivistName: archivist.name,
    rank:          archivist.rank,
  })
  response.cookies.set('archivist-auth', archivistId, cookieOptions)
  response.cookies.set('archivist-id',   archivistId, cookieOptions)
  return response
}
