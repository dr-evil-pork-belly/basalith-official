import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export async function GET() {
  try {
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

    const { data: recordings, error } = await supabaseAdmin
      .from('voice_recordings')
      .select('id, created_at, duration_seconds, transcript, language_detected, storage_path, prompt')
      .eq('archive_id', archiveId)
      .eq('transcript_status', 'complete')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Truncate transcripts for list view
    const list = (recordings || []).map(r => ({
      ...r,
      transcript: r.transcript ? r.transcript.slice(0, 200) : null,
    }))

    return NextResponse.json({ recordings: list })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Voice recordings list error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
