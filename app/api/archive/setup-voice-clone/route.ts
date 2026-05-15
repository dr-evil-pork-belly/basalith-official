import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ElevenLabsClient } from 'elevenlabs'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  let bodyArchiveId: string | null = null
  try {
    const body = await req.json()
    bodyArchiveId = body.archiveId ?? null
  } catch {}

  // Auth: god-mode cookie OR owner archive-id cookie
  const godAuth        = cookieStore.get('god-mode-auth')?.value
  const expected       = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  const isGodMode      = !!expected && godAuth === expected
  const ownerArchiveId = cookieStore.get('archive-id')?.value ?? null

  let archiveId: string | null = null
  if (isGodMode && bodyArchiveId) {
    archiveId = bodyArchiveId
  } else if (ownerArchiveId) {
    archiveId = ownerArchiveId
  }

  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 })

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('owner_name, name, elevenlabs_voice_id')
    .eq('id', archiveId)
    .single()

  if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  // Fetch recordings, deduplicate by storage_path before downloading
  const { data: rawRecordings } = await supabaseAdmin
    .from('voice_recordings')
    .select('id, storage_path, duration_seconds')
    .eq('archive_id', archiveId)
    .eq('transcript_status', 'complete')
    .gte('duration_seconds', 30)
    .order('duration_seconds', { ascending: false })
    .limit(20)

  // Deduplicate by storage_path so the same file is never included twice
  const recordings = (rawRecordings ?? []).filter(
    (rec, index, self) => index === self.findIndex(r => r.storage_path === rec.storage_path)
  ).slice(0, 5)

  if (recordings.length < 3) {
    return NextResponse.json({
      error:           'Need at least 3 unique voice recordings of 30+ seconds each.',
      recordingsFound: recordings.length,
    }, { status: 400 })
  }

  // Download audio — skip any that fail or produce duplicate content
  const audioBuffers: Buffer[] = []
  const seenSizes = new Set<number>()

  for (const rec of recordings) {
    const { data, error } = await supabaseAdmin.storage.from('voice-recordings').download(rec.storage_path)
    if (error || !data) {
      console.warn('[voice-clone] download failed for', rec.storage_path, error?.message)
      continue
    }
    const buf = Buffer.from(await data.arrayBuffer())
    // Skip if we've already got a buffer of this exact size (duplicate content guard)
    if (seenSizes.has(buf.length)) {
      console.warn('[voice-clone] skipping duplicate-size buffer:', buf.length)
      continue
    }
    seenSizes.add(buf.length)
    audioBuffers.push(buf)
  }

  if (audioBuffers.length < 3) {
    return NextResponse.json({
      error:           `Could not download enough unique audio files (got ${audioBuffers.length}, need 3).`,
      recordingsFound: recordings.length,
    }, { status: 500 })
  }

  // Build File objects with unique timestamped names so ElevenLabs never sees duplicate filenames
  const ts    = Date.now()
  const files = audioBuffers.map((buf, i) =>
    new File([new Uint8Array(buf)], `voice_sample_${i}_${ts}.mp3`, { type: 'audio/mpeg' })
  )

  const ownerName = archive.owner_name ?? archive.name

  console.log('[voice-clone] uploading', files.length, 'samples for', ownerName, 'archiveId:', archiveId)

  try {
    const client = new ElevenLabsClient({ apiKey })

    const voice = await client.voices.add({
      name:        `${ownerName} Basalith`,
      files,
      description: `Voice clone for ${ownerName}`,
    })

    console.log('[voice-clone] success:', voice.voice_id)

    await supabaseAdmin.from('archives').update({
      elevenlabs_voice_id: voice.voice_id,
      voice_cloned_at:     new Date().toISOString(),
      voice_samples_count: files.length,
    }).eq('id', archiveId)

    return NextResponse.json({ success: true, voiceId: voice.voice_id, samplesUsed: files.length })
  } catch (err: any) {
    console.error('[voice-clone] ElevenLabs error:', err.message || err)
    return NextResponse.json({
      error:  'Voice clone failed',
      detail: err.message ?? String(err),
    }, { status: 500 })
  }
}
