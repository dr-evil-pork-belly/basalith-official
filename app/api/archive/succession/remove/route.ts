import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too). Without this, a
  // successor could remove their peers.
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
    .eq('archive_id', archiveId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
