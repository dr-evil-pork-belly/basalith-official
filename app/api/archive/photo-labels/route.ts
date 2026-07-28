import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const photographId = searchParams.get('photographId')

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

  if (!photographId) {
    return NextResponse.json({ error: 'photographId required' }, { status: 400 })
  }

  const { data: labels } = await supabaseAdmin
    .from('labels')
    .select('id, what_was_happening, labelled_by, year_taken')
    .eq('archive_id', archiveId)
    .eq('photograph_id', photographId)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ labels: labels ?? [] })
}
