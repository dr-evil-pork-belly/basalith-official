import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    .select('id, label, date_type, month, day, year, person_name, notes, active')
    .eq('archive_id', archiveId)
    .eq('active', true)
    .order('year', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const { label, date_type, month, day, year, person_name, notes } = body

  if (!label) {
    return NextResponse.json({ error: 'label required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('significant_dates')
    .insert({
      archive_id:  archiveId,
      label:       label.trim(),
      date_type:   date_type ?? 'custom',
      month:       month   ?? null,
      day:         day     ?? null,
      year:        year    ?? null,
      person_name: person_name ?? null,
      notes:       notes   ?? null,
      active:      true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ date: data })
}
