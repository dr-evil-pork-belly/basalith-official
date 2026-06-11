import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Shared logout for owners, Legacy Guides, and successors. Clears the
// Supabase Auth session (and the legacy archive-id selection cookie set by
// /api/archive/switch). Replaces the old per-role cookie-clearing routes
// (archive-signout, archivist-signout, succession/logout).

async function clearSession() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function GET(req: NextRequest) {
  await clearSession()
  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set('archive-id', '', { path: '/', maxAge: 0 })
  return res
}

export async function POST() {
  await clearSession()
  const res = NextResponse.json({ ok: true })
  res.cookies.set('archive-id', '', { path: '/', maxAge: 0 })
  return res
}
