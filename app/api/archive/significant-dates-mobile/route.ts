import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

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
  const body = await req.json()
  const { archiveId, label, date_type, month, day, year, person_name, notes } = body

  if (!archiveId || !label) {
    return NextResponse.json({ error: 'archiveId and label required' }, { status: 400 })
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
