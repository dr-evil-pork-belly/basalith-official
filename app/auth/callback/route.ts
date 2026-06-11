import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const session = await getSessionUser()

      // owner+guide resolves to role 'owner' already (set during the
      // Phase 3 backfill with owner > guide > successor precedence), so
      // that combination lands on /archive/dashboard by default here.
      if (session?.role === 'owner')     return NextResponse.redirect(`${origin}/archive/dashboard`)
      if (session?.role === 'guide')     return NextResponse.redirect(`${origin}/archivist/dashboard`)
      if (session?.role === 'successor') return NextResponse.redirect(`${origin}/succession/portal`)

      return NextResponse.redirect(`${origin}/archive-login?error=no_role`)
    }
  }

  return NextResponse.redirect(`${origin}/archive-login?error=auth_failed`)
}
