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
    .select('id, status, preferred_language')
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

  res.cookies.set('archive-auth', 'true',      cookieOpts)
  res.cookies.set('archive-id',   archive.id,  cookieOpts)

  // Set lang cookie so LanguageProvider auto-selects the owner's preferred language.
  // Not httpOnly — must be readable by client-side JS.
  if (archive.preferred_language && archive.preferred_language !== 'en') {
    res.cookies.set('lang', archive.preferred_language, {
      httpOnly: false,
      secure:   true,
      sameSite: 'lax' as const,
      maxAge:   60 * 60 * 24 * 365,
      path:     '/',
    })
  }

  return res
}
