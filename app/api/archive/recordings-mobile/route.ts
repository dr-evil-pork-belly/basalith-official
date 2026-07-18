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
    .from('voice_recordings')
    .select('id, prompt, duration_seconds, transcript, language_detected, created_at, transcript_status')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const recordings = (data ?? []).map(r => ({
    id:              r.id,
    prompt:          r.prompt ?? '',
    durationSeconds: r.duration_seconds ?? 0,
    transcript:      r.transcript ? r.transcript.substring(0, 200) : null,
    status:          r.transcript_status ?? 'pending',
    createdAt:       r.created_at,
  }))

  return NextResponse.json({ recordings })
}
