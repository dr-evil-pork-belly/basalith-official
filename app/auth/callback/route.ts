import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )

  let failed = false
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    failed = !!error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    failed = !!error
  } else {
    return NextResponse.redirect(`${origin}/archive-login?error=auth_failed`)
  }

  if (failed) return NextResponse.redirect(`${origin}/archive-login?error=auth_failed`)

  const session = await getSessionUser()
  if (session?.role === 'owner')     return NextResponse.redirect(`${origin}/archive/dashboard`)
  if (session?.role === 'guide')     return NextResponse.redirect(`${origin}/archivist/dashboard`)
  if (session?.role === 'successor') return NextResponse.redirect(`${origin}/succession/portal`)
  return NextResponse.redirect(`${origin}/archive-login?error=no_role`)
}
