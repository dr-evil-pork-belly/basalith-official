import { NextResponse } from 'next/server'

// DEPRECATED — password login (Supabase-stored archive_credentials and the
// ARCHIVE_CREDENTIALS / ARCHIVE_PASSWORD env vars) has been removed as part
// of the Supabase Auth migration (Phase 4a). Owners sign in at
// /archive-login with a magic link.
export async function POST() {
  return NextResponse.json(
    { error: 'Password sign-in has been retired. Request a sign-in link at /archive-login.' },
    { status: 410 }
  )
}
