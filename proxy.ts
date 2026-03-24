import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect archivist portal — cookie-based password auth
  if (pathname.startsWith('/archivist/') || pathname === '/archivist') {
    const archivistAuth = request.cookies.get('archivist-auth')
    if (!archivistAuth || archivistAuth.value !== process.env.ARCHIVIST_TOKEN) {
      return NextResponse.redirect(new URL('/archivist-login', request.url))
    }
  }

  // Protect archive portal — cookie-based password auth
  if (pathname.startsWith('/archive/') || pathname === '/archive') {
    const archiveAuth = request.cookies.get('archive-auth')
    if (!archiveAuth || archiveAuth.value !== process.env.ARCHIVE_TOKEN) {
      return NextResponse.redirect(new URL('/archive-login', request.url))
    }
  }

  // Protect dashboard + curator routes — redirect unauthenticated users to login
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/curator'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect already-logged-in users away from the login page
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/curator/:path*', '/login', '/archivist/:path*', '/archivist', '/archive/:path*', '/archive'],
}
