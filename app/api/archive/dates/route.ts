import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

// ── GET — list all significant dates ──────────────────────────────────────
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
    .from('significant_dates')
    .select('*')
    .eq('archive_id', archiveId)
    .eq('active', true)
    .order('month', { ascending: true })
    .order('day',   { ascending: true })

  console.log('dates GET: found', data?.length ?? 0, 'rows, error =', error?.message)

  if (error) {
    return NextResponse.json({ error: error.message, dates: [] }, { status: 200 })
  }

  return NextResponse.json({ dates: data ?? [] })
}

// ── POST — add a new significant date ─────────────────────────────────────
export async function POST(req: Request) {
  try {
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

    const body = await req.json()
    const { personName, dateType, month, day, year, notes } = body

    if (!personName || !dateType || !month || !day) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('significant_dates')
      .insert({
        archive_id:  archiveId,
        person_name: personName,
        date_type:   dateType,
        month:       parseInt(month),
        day:         parseInt(day),
        year:        year ? parseInt(year) : null,
        notes:       notes?.trim() || null,
        active:      true,
      })
      .select()
      .single()

    console.log('dates POST insert error:', error?.message)

    if (error) throw error

    return NextResponse.json({ date: data })
  } catch (err: any) {
    console.error('dates POST:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE — soft-delete (set active = false) ──────────────────────────────
export async function DELETE(req: Request) {
  try {
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

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Scoped to the caller's own archive. A date id alone is not authority to
    // retire a row.
    const { data: target } = await supabaseAdmin
      .from('significant_dates')
      .select('id')
      .eq('id', id)
      .eq('archive_id', archiveId)
      .maybeSingle()

    if (!target) return NextResponse.json({ error: 'Date not found' }, { status: 404 })

    const { error } = await supabaseAdmin
      .from('significant_dates')
      .update({ active: false })
      .eq('id', id)
      .eq('archive_id', archiveId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('dates DELETE:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
