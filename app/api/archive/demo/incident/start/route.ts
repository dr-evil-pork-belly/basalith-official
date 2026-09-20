import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { pickDemoSeed, startDemoSession } from '@/lib/demoIncidentBuffer'

export const dynamic = 'force-dynamic'

const ONE_HOUR_MS = 60 * 60 * 1000

// Ephemeral demo capture buffer: session start.
//
// Founder-run, so it sits behind getSessionUser() at the admin-strength standard
// (a real Supabase session, not the deprecated cookie-presence path). It seeds a
// transient incident session whose archiveId is a synthetic `demo:<uuid>` that no
// real table references. NOTHING is persisted here: no owner_deposits, no
// training pair, no incident_sessions row. The returned session is held by the
// browser (the buffer) and posted back to /turn each answer. See
// lib/demoIncidentBuffer.ts for the write-free transform.
export async function POST(req: NextRequest) {
  // ── Guard: owner auth (admin-strength door) ──────────────────────────────────
  // Was the Legacy Guide session until September 20, 2026, when the Guide portal
  // was retired. The door is the same strength, a real Supabase session; only
  // the role changed, because the founder runs every demo now.
  const owner = await getSessionUser()
  if (!owner?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Rate limit ───────────────────────────────────────────────────────────────
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`demo-incident-start:${ip}`, 20, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const seed = await pickDemoSeed()
  const { session, probe } = startDemoSession(seed)

  return NextResponse.json({ session, probe })
}
