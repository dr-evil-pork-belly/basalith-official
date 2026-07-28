import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

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
    .from('photographs')
    .select('status, ai_processed')
    .eq('archive_id', archiveId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const photos      = data ?? []
  const total       = photos.length
  const processed   = photos.filter(p => p.ai_processed).length
  const kept        = photos.filter(p => p.status === 'unlabelled' || p.status === 'labelled').length
  const discarded   = photos.filter(p => p.status === 'discarded').length
  const needsReview = photos.filter(p => p.status === 'needs_review').length
  const pending     = photos.filter(p => p.status === 'pending_ai' || !p.ai_processed).length

  return NextResponse.json({
    total,
    processed,
    kept,
    discarded,
    needsReview,
    pending,
    processingComplete: pending === 0 && total > 0,
  })
}
