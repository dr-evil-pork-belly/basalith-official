// DISABLED. The ElevenLabs subscription was cancelled in August 2026.
// This route synthesizes arbitrary text in an archive's cloned voice and is
// reachable only from god mode, where its button is now disabled. It is
// retained, not deleted, so the diagnostic path exists when a replacement voice
// provider is wired. Every call fails until then: 503 if ELEVENLABS_API_KEY is
// unset, 500 from the catch below if the key is set but the account is dead.
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ElevenLabsClient } from 'elevenlabs'

export const dynamic    = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()

  let bodyArchiveId: string | null = null
  let testText: string | null = null
  try {
    const body  = await req.json()
    bodyArchiveId = body.archiveId ?? null
    testText      = body.testText  ?? null
  } catch {}

  // Auth: god-mode cookie only. An owner-session fallback used to sit here and
  // authorized on session.archiveId alone, which is not proof of ownership
  // (getSessionUser fills archiveId for successors too), so any signed-in
  // successor could synthesize the owner's cloned voice saying arbitrary text
  // and receive a signed URL to it. It had no caller: app/god/GodModeClient.tsx
  // is the only call site and it always sends an archiveId, so it always took
  // the god branch. Removed rather than guarded.
  const godAuth   = cookieStore.get('god-mode-auth')?.value
  const expected  = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  const isGodMode = !!expected && godAuth === expected

  if (!isGodMode || !bodyArchiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = bodyArchiveId
  if (!testText?.trim()) return NextResponse.json({ error: 'testText required' }, { status: 400 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 })

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('name, elevenlabs_voice_id, preferred_language')
    .eq('id', archiveId)
    .single()

  if (!archive)                    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  if (!archive.elevenlabs_voice_id) return NextResponse.json({ error: 'No voice clone set up for this archive' }, { status: 400 })

  const lang = archive.preferred_language ?? 'en'

  try {
    const client = new ElevenLabsClient({ apiKey })

    const ttsOptions: Record<string, unknown> = {
      text:     testText.trim(),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability:         0.5,
        similarity_boost:  0.85,
        style:             0.2,
        use_speaker_boost: true,
      },
    }
    // Omit language_code for Chinese to let the clone handle pronunciation
    if (lang !== 'zh' && lang !== 'yue') {
      const codeMap: Record<string, string> = { ja: 'ja', ko: 'ko', es: 'es', vi: 'vi' }
      const code = codeMap[lang]
      if (code) ttsOptions.language_code = code
    }

    const audioStream = await client.textToSpeech.convert(
      archive.elevenlabs_voice_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ttsOptions as any,
    )

    const chunks: Uint8Array[] = []
    for await (const chunk of audioStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const audioBuffer = Buffer.concat(chunks)

    // Upload to ephemeral test path (overwritten each time)
    const testPath = `${archiveId}/test/voice_test.mp3`
    await supabaseAdmin.storage
      .from('voice-recordings')
      .upload(testPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

    // Signed URL valid for 1 hour
    const { data: signed } = await supabaseAdmin.storage
      .from('voice-recordings')
      .createSignedUrl(testPath, 3600)

    return NextResponse.json({ success: true, audioUrl: signed?.signedUrl ?? null })
  } catch (err: any) {
    console.error('[test-voice] ElevenLabs error:', err.message || err)
    return NextResponse.json({ error: 'Voice generation failed', detail: err.message }, { status: 500 })
  }
}
