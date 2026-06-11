import { NextResponse } from 'next/server'

// DEPRECATED — password login (successors.password_hash) has been removed
// as part of the Supabase Auth migration (Phase 4a). Successors sign in at
// /succession/login with a magic link.
export async function POST() {
  return NextResponse.json(
    { error: 'Password sign-in has been retired. Request a sign-in link at /succession/login.' },
    { status: 410 }
  )
}
