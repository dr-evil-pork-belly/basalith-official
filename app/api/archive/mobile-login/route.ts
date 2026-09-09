import { NextResponse } from 'next/server'

// RETIRED 2026-09-08. This was the pre-Supabase-Auth mobile shim: an
// unauthenticated bcrypt password check that returned an archive id and
// minted no session. The July 2026 auth sweep closed every route it fed, and
// docs/API_AUTH_TRIAGE_2_2026-07.md section 1 recorded it as a password
// oracle with no rate limit. The iOS app now signs in with a Supabase email
// OTP and sends `Authorization: Bearer <access token>` (see
// lib/auth/getSessionUser.ts). Nothing calls this route any more.
//
// Kept as a 410 rather than deleted so an old app build gets a clear
// message instead of a 404, and so the path cannot be silently reintroduced.

const GONE = {
  error: 'This sign-in method has been retired. Please update the Basalith app and sign in with the code sent to your email.',
  code:  'MOBILE_LOGIN_RETIRED',
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 })
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 })
}
