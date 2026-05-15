import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ElevenLabsClient } from 'elevenlabs'

export const dynamic   = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  // Accept body for auth resolution (don't consume stream twice)
  let bodyArchiveId: string | null = null
  try {
    const body = await req.json()
    bodyArchiveId = body.archiveId ?? null
  } catch {}

  // Auth: god-mode cookie OR owner archive-id cookie
  const godAuth   = cookieStore.get('god-mode-auth')?.value
  const expected  = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  const isGodMode = !!expected && godAuth === expected
  const ownerArchiveId = cookieStore.get('archive-id')?.value ?? null

  // God Mode: archiveId must come from body
  // Owner: archiveId must match their session cookie
  let archiveId: string | null = null
  if (isGodMode && bodyArchiveId) {
    archiveId = bodyArchiveId
  } else if (ownerArchiveId) {
    archiveId = ownerArchiveId
  }

  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 })

  // Get archive info
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('owner_name, name, elevenlabs_voice_id')
    .eq('id', archiveId)
    .single()

  if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  // Check for sufficient voice recordings
  const { data: recordings } = await supabaseAdmin
    .from('voice_recordings')
    .select('id, storage_path, duration_seconds')
    .eq('archive_id', archiveId)
    .eq('transcript_status', 'complete')
    .gte('duration_seconds', 30)
    .order('duration_seconds', { ascending: false })
    .limit(10)

  if (!recordings || recordings.length < 3) {
    return NextResponse.json({
      error: 'Need at least 3 voice recordings of 30+ seconds each to create a voice portrait.',
      recordingsFound: recordings?.length ?? 0,
    }, { status: 400 })
  }

  // Download audio files from Supabase storage
  const audioBlobs: Blob[] = []
  for (const rec of recordings.slice(0, 5)) {
    const { data, error } = await supabaseAdmin.storage.from('voice-recordings').download(rec.storage_path)
    if (!error && data) audioBlobs.push(data)
  }

  if (audioBlobs.length < 3) {
    return NextResponse.json({ error: 'Could not download enough audio files' }, { status: 500 })
  }

  try {
    const client = new ElevenLabsClient({ apiKey })

    // Convert blobs to File objects for the API
    const files = audioBlobs.map((blob, i) => new File([blob], `voice_sample_${i}.mp3`, { type: 'audio/mpeg' }))

    const voice = await client.voices.add({
      name:        `${archive.owner_name ?? archive.name} - Basalith`,
      files,
      description: `Voice clone for ${archive.owner_name}'s Basalith entity`,
    })

    await supabaseAdmin.from('archives').update({
      elevenlabs_voice_id:  voice.voice_id,
      voice_cloned_at:      new Date().toISOString(),
      voice_samples_count:  audioBlobs.length,
    }).eq('id', archiveId)

    return NextResponse.json({ success: true, voiceId: voice.voice_id, samplesUsed: audioBlobs.length })
  } catch (err: any) {
    console.error('[setup-voice-clone] ElevenLabs error:', err.message)
    return NextResponse.json({ error: `ElevenLabs error: ${err.message}` }, { status: 500 })
  }
}
