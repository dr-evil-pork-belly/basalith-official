import { NextRequest, NextResponse } from 'next/server'

const DEMO_ARCHIVE_ID = 'f44f1818-8f17-499d-8f27-23e286e923f7'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ARCHIVE_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieOpts = {
    httpOnly: true,
    path:     '/',
    maxAge:   60 * 60 * 24 * 7,   // 7 days
    sameSite: 'lax' as const,
    secure:   process.env.NODE_ENV === 'production',
  }

  const res = NextResponse.json({ ok: true })

  // Auth token — checked by proxy.ts middleware
  res.cookies.set('archive-auth', process.env.ARCHIVE_TOKEN!, cookieOpts)

  // Archive ID — allows future multi-client support without code changes
  res.cookies.set('archive-id', DEMO_ARCHIVE_ID, cookieOpts)

  return res
}
