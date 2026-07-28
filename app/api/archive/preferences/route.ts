import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

const VALID_CADENCES  = ['daily', 'three_weekly', 'weekly', 'paused']
const VALID_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu',
]

// GET — fetch preferences for an archive
export async function GET() {
  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too).
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('email_preferences')
    .select('*')
    .eq('archive_id', archiveId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preferences: data ?? null })
}

// POST — upsert preferences
export async function POST(req: NextRequest) {
  try {
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too). Setting
    // cadence: 'paused' silences an archive's whole email programme.
    const session = await getSessionUser()
    if (!session?.archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const archiveId = session.archiveId

    const { data: ownerRow } = await supabaseAdmin
      .from('archives')
      .select('owner_user_id')
      .eq('id', archiveId)
      .maybeSingle()
    if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body      = await req.json()
    const { cadence, send_time, timezone } = body

    if (cadence    && !VALID_CADENCES.includes(cadence))   return NextResponse.json({ error: 'Invalid cadence' }, { status: 400 })
    if (timezone   && !VALID_TIMEZONES.includes(timezone)) return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })

    const active = cadence !== 'paused'

    const { data, error } = await supabaseAdmin
      .from('email_preferences')
      .upsert({
        archive_id: archiveId,
        cadence:    cadence    ?? 'daily',
        send_time:  send_time  ?? '21:00',
        timezone:   timezone   ?? 'America/New_York',
        active,
      }, { onConflict: 'archive_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ preferences: data })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
