import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const archiveId = req.cookies.get('archive-id')?.value
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { successorId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { successorId } = body
  if (!successorId) return NextResponse.json({ error: 'successorId required' }, { status: 400 })

  // Verify the successor belongs to this archive before deleting
  const { data: successor } = await supabaseAdmin
    .from('successors')
    .select('id')
    .eq('id', successorId)
    .eq('archive_id', archiveId)
    .single()

  if (!successor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('successors')
    .delete()
    .eq('id', successorId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
