import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

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
