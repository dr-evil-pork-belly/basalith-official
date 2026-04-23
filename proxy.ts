
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes are always public
  // Webhooks must never be redirected
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Protect archive pages only
  if (pathname.startsWith('/archive/') || pathname === '/archive') {
    const auth = request.cookies.get('archive-auth')
    const id   = request.cookies.get('archive-id')
    if (!auth?.value || !id?.value || auth.value !== id.value) {
      return NextResponse.redirect(new URL('/archive-login', request.url))
    }
  }

  // Protect archivist pages only
  if (pathname.startsWith('/archivist/') || pathname === '/archivist') {
    const auth = request.cookies.get('archivist-auth')
    const id   = request.cookies.get('archivist-id')
    if (!auth?.value || !id?.value || auth.value !== id.value) {
      return NextResponse.redirect(new URL('/archivist-login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/archive/:path*',
    '/archivist/:path*',
  ],
}
