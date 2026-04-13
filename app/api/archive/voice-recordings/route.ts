import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const archiveId = searchParams.get('archiveId')

    if (!archiveId) {
      return NextResponse.json({ error: 'Missing archiveId' }, { status: 400 })
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
