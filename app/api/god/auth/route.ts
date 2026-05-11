import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Rate-limit god mode login attempts
  const ip    = getClientIP(req)
  const limit = checkRateLimit(`god-login:${ip}`, 5, 15 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  try {
    const { password } = await req.json()
    const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''

    if (!expected || password !== expected) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('god-mode-auth', password, {
      httpOnly: true,
      secure:   true,           // always — never allow over HTTP
      sameSite: 'strict',       // upgraded from 'lax'
      path:     '/',
      maxAge:   60 * 60 * 4,   // 4 hours — shorter window for admin access
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
