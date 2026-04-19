import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const res = NextResponse.redirect(
    new URL('/god', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  )
  res.cookies.set('archive-auth', '', { path: '/', maxAge: 0 })
  res.cookies.set('archive-id',   '', { path: '/', maxAge: 0 })
  return res
}
