import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/archive-login?error=invalid', req.url))
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, status')
    .eq('magic_link_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!archive) {
    return NextResponse.redirect(new URL('/archive-login?error=invalid', req.url))
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const res = NextResponse.redirect(new URL('/archive/dashboard', siteUrl))

  const cookieOpts = {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  }

  res.cookies.set('archive-auth',  'true',       cookieOpts)
  res.cookies.set('archive-id',    archive.id,   cookieOpts)

  return res
}
