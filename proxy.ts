import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Phase 4a — Supabase Auth session gate, additive to the existing
// cookie-based guards on individual pages and API routes.
//
// This proxy only checks that a Supabase session exists for the
// matched paths. It does not resolve role or scope (that happens in
// getSessionUser, used by the converted page/route guards). If there is
// no Supabase session, the request is redirected to the login page that
// matches the section being accessed.
//
// god-mode (/god) is intentionally NOT covered here. Admin access is still
// the separate god-mode-auth cookie checked by getGodModeAuth, and admin
// accounts are not part of this migration yet (Phase 5). Adding /god to
// this gate now would lock out admin access on preview, since admin users
// do not have Supabase sessions.
const PROTECTED: { prefix: string; loginPath: string }[] = [
  { prefix: '/archive',           loginPath: '/archive-login' },
  { prefix: '/archivist',         loginPath: '/archivist-login' },
  { prefix: '/succession/portal', loginPath: '/succession/login' },
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const match = PROTECTED.find(p => pathname.startsWith(p.prefix))
  if (!match) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL(match.loginPath, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/archive/:path*',
    '/archivist/:path*',
    '/succession/portal/:path*',
  ],
}
