import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// ── GET — list all significant dates ──────────────────────────────────────
export async function GET(req: Request) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')

  console.log('dates GET: archiveId =', archiveId)

  if (!archiveId) {
    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
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
    const body = await req.json()
    const { archiveId, personName, dateType, month, day, year, notes } = body

    console.log('dates POST body:', JSON.stringify(body))

    if (!archiveId || !personName || !dateType || !month || !day) {
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
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('significant_dates')
      .update({ active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('dates DELETE:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
