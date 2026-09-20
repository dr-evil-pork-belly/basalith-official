import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// /archivist was removed September 20, 2026 with the Guide portal. The one
// gated page that survived that tree, the incident capture demo, moved under
// /archive and is covered by the rule below.
const PROTECTED: { prefix: string; loginPath: string }[] = [
  { prefix: '/archive',           loginPath: '/archive-login' },
  { prefix: '/succession/portal', loginPath: '/succession/login' },
]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const match = PROTECTED.find(p => pathname === p.prefix || pathname.startsWith(p.prefix + '/'))
  if (match && !user) {
    return NextResponse.redirect(new URL(match.loginPath, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
