import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let password: string
  try {
    const body = await req.json()
    password = body.password
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 })
  }

  if (!password || password !== process.env.ARCHIVIST_PASSWORD) {
    return NextResponse.json({ success: false, error: 'Invalid password.' }, { status: 401 })
  }

  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 30, // 30 days
    path:     '/',
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('archivist-auth', process.env.ARCHIVIST_TOKEN!, cookieOpts)
  response.cookies.set('archivist-id',   process.env.DEMO_ARCHIVIST_ID!, cookieOpts)
  return response
}
