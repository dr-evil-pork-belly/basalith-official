import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { getFoundingStatus, startFoundingCall } from '@/lib/foundingSequence'
import { loadOpenIncident } from '@/lib/incidentSession'

export const dynamic = 'force-dynamic'

const ONE_HOUR_MS = 60 * 60 * 1000

// Opens the next founding call for the caller's own archive and returns its
// SEED probe. Idempotent in effect: if an incident is already open (founding or
// not) it returns that incident's pending probe instead of opening a second
// one, which the partial unique index would refuse anyway. If the sequence is
// done it says so. archiveId is resolved from the session, never the client.
export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`founding-start:${ip}`, 30, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const before = await getFoundingStatus(archive.id, archive.tier)
    if (before.done) {
      return NextResponse.json({ ok: true, done: true, current: null, status: before })
    }
    if (before.current) {
      return NextResponse.json({ ok: true, done: false, current: before.current, status: before })
    }

    const started = await startFoundingCall(archive.id, archive.tier)
    if (!started) {
      // Lost a race with a concurrent open, or the state changed under us.
      // Re-read and serve whatever is open now rather than erroring.
      const raced = await loadOpenIncident(archive.id)
      const refreshed = await getFoundingStatus(archive.id, archive.tier)
      if (raced) return NextResponse.json({ ok: true, done: false, current: refreshed.current, status: refreshed })
      return NextResponse.json({ error: 'Could not start the next call' }, { status: 500 })
    }

    const refreshed = await getFoundingStatus(archive.id, archive.tier)
    return NextResponse.json({ ok: true, done: false, call: started.call, current: refreshed.current, status: refreshed })
  } catch (err) {
    // The most likely live failure is a CHECK constraint on
    // incident_sessions.category that the repo cannot see (the table was
    // created in the dashboard). The runbook has the query to confirm it.
    console.error('[founding/start]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start the next call' }, { status: 500 })
  }
}
