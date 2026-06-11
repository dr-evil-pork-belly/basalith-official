import { NextResponse } from 'next/server'

// DEPRECATED — password login via ARCHIVIST_CREDENTIALS / ARCHIVIST_PASSWORD
// env vars has been removed as part of the Supabase Auth migration
// (Phase 4a). Legacy Guides sign in at /archivist-login with a magic link.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Password sign-in has been retired. Request a sign-in link at /archivist-login.' },
    { status: 410 }
  )
}
