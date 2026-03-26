import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/archivist/prospects
export async function GET(req: NextRequest) {
  const archivistId = req.nextUrl.searchParams.get('archivistId')
  if (!archivistId) return NextResponse.json({ error: 'No archivist ID' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('prospects')
    .select('*')
    .eq('archivist_id', archivistId)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospects: data ?? [] })
}

// POST /api/archivist/prospects
export async function POST(req: NextRequest) {
  const body = await req.json()
  const archivistId: string | null = body.archivistId ?? null
  if (!archivistId) return NextResponse.json({ error: 'No archivist ID' }, { status: 400 })

  const { name, contact, status, tier, last_contact, next_action, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('prospects')
    .insert({
      archivist_id: archivistId,
      name:         name.trim(),
      contact:      contact ?? '',
      status:       status ?? 'New',
      tier:         tier ?? '',
      last_contact: last_contact || null,
      next_action:  next_action ?? '',
      notes:        notes ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospect: data })
}

// PATCH /api/archivist/prospects
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const archivistId: string | null = body.archivistId ?? null
  if (!archivistId) return NextResponse.json({ error: 'No archivist ID' }, { status: 400 })

  const { id, archivistId: _aid, ...updates } = body

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // If closing, record closed_at and update archivist closings count
  const extraUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.status === 'Closed') {
    extraUpdates.closed_at = new Date().toISOString()
    // Bump archivist counters (best-effort, ignore errors)
    await supabaseAdmin.rpc('increment_closings', { archivist_id: archivistId }).maybeSingle()
  }

  const { data, error } = await supabaseAdmin
    .from('prospects')
    .update({ ...updates, ...extraUpdates })
    .eq('id', id)
    .eq('archivist_id', archivistId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospect: data })
}

// DELETE /api/archivist/prospects?id=xxx&archivistId=xxx
export async function DELETE(req: NextRequest) {
  const archivistId = req.nextUrl.searchParams.get('archivistId')
  if (!archivistId) return NextResponse.json({ error: 'No archivist ID' }, { status: 400 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('prospects')
    .delete()
    .eq('id', id)
    .eq('archivist_id', archivistId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
