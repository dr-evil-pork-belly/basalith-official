import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}

// Build an action URL with & escaped as &amp; for valid XML attributes.
function buildActionUrl(base: string, params: Record<string, string>): string {
  const query = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&amp;')
  return `${base}?${query}`
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contributorId    = searchParams.get('contributorId') ?? ''
  const questionId       = searchParams.get('questionId')    ?? ''
  const archiveId        = searchParams.get('archiveId')     ?? ''
  const isOwner          = searchParams.get('isOwner') === 'true'

  const formData = await req.formData()

  // Log every param Twilio sends so we can debug URL / auth issues.
  console.log('[twilio/recording] all params:')
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`)
  }

  const recordingUrl      = formData.get('RecordingUrl')      as string | null
  const recordingSid      = formData.get('RecordingSid')      as string | null
  const recordingDuration = formData.get('RecordingDuration') as string | null
  const callSid           = formData.get('CallSid')           as string | null

  console.log(`[twilio/recording] sid=${callSid} archiveId=${archiveId} duration=${recordingDuration}s recordingSid=${recordingSid}`)

  if (!archiveId) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
  }

  // ── Download + process (non-fatal — always return TwiML) ─────────────────────
  let storagePath    = ''
  let transcript     = ''
  let downloadOk     = false

  try {
    // Give Twilio 3 seconds to finish processing before we fetch.
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Build explicit API URL from RecordingSid (more reliable than RecordingUrl + .mp3).
    const accountSid  = process.env.TWILIO_ACCOUNT_SID
    const authToken   = process.env.TWILIO_AUTH_TOKEN
    const downloadUrl = recordingSid && accountSid
      ? `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`
      : recordingUrl
        ? `${recordingUrl}.mp3`
        : null

    if (!downloadUrl) {
      throw new Error('No RecordingSid or RecordingUrl — cannot download')
    }

    console.log(`[twilio/recording] downloading from: ${downloadUrl}`)

    const audioResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    })

    console.log(`[twilio/recording] download status: ${audioResponse.status} ${audioResponse.statusText}`)

    if (!audioResponse.ok) {
      throw new Error(`Download failed: ${audioResponse.status} ${audioResponse.statusText}`)
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const fileName    = `${archiveId}/phone-${Date.now()}.mp3`

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabaseAdmin
      .storage
      .from('voice-recordings')
      .upload(fileName, audioBuffer, { contentType: 'audio/mp3', upsert: false })

    if (uploadErr) throw new Error(`Storage upload: ${uploadErr.message}`)
    storagePath = fileName
    downloadOk  = true

    // Transcribe with Whisper
    try {
      const whisperForm = new FormData()
      whisperForm.append('file', new Blob([audioBuffer], { type: 'audio/mp3' }), 'recording.mp3')
      whisperForm.append('model', 'whisper-1')
      whisperForm.append('response_format', 'verbose_json')

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method:  'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body:    whisperForm,
      })

      if (whisperRes.ok) {
        const data = await whisperRes.json()
        transcript = data.text ?? ''
        console.log(`[twilio/recording] transcript (${transcript.length} chars): ${transcript.slice(0, 100)}`)
      } else {
        console.error('[twilio/recording] Whisper returned', whisperRes.status)
      }
    } catch (err) {
      console.error('[twilio/recording] Whisper failed:', err)
    }

  } catch (err: unknown) {
    console.error('[twilio/recording] Download/upload failed:', err instanceof Error ? err.message : err)
  }

  // ── Save voice_recordings row (always — with whatever we have) ───────────────
  try {
    await supabaseAdmin.from('voice_recordings').insert({
      archive_id:            archiveId,
      storage_path:          storagePath || `twilio:${recordingSid ?? 'unknown'}`,
      duration_seconds:      parseInt(recordingDuration ?? '0') || 0,
      transcript:            transcript || null,
      transcript_status:     downloadOk ? (transcript ? 'complete' : 'failed') : 'pending',
      prompt:                'Phone call recording',
      mime_type:             'audio/mp3',
      twilio_recording_sid:  recordingSid ?? null,
    })
  } catch (err: unknown) {
    console.error('[twilio/recording] voice_recordings insert failed:', err instanceof Error ? err.message : err)
  }

  // ── Save deposit / labels (always — with transcript if we have it) ────────────
  try {
    const depositText = transcript && transcript.length > 20
      ? transcript
      : downloadOk
        ? null  // downloaded but no transcript — skip deposit
        : `Phone recording received (${recordingDuration}s). Audio retrieval pending — RecordingSid: ${recordingSid ?? 'unknown'}.`

    if (depositText) {
      if (isOwner) {
        await supabaseAdmin.from('owner_deposits').insert({
          archive_id:     archiveId,
          prompt:         'Phone call deposit',
          response:       depositText,
          essence_status: 'pending',
          source:         'phone_recording',
        })
      } else {
        const { data: deposit } = await supabaseAdmin
          .from('owner_deposits')
          .insert({
            archive_id:     archiveId,
            prompt:         'Phone call recording',
            response:       depositText,
            essence_status: 'pending',
            source:         'phone_recording',
          })
          .select('id')
          .single()

        const depositId = deposit?.id ?? null

        if (questionId && depositId && transcript) {
          await supabaseAdmin
            .from('contributor_questions')
            .update({ status: 'answered', answer_text: transcript, answered_at: new Date().toISOString(), deposit_id: depositId })
            .eq('id', questionId)
        }

        if (contributorId && transcript) {
          const { data: contrib } = await supabaseAdmin
            .from('contributors')
            .select('name')
            .eq('id', contributorId)
            .single()

          if (contrib) {
            await supabaseAdmin.from('labels').insert({
              archive_id:         archiveId,
              labelled_by:        contrib.name,
              what_was_happening: transcript,
              is_primary_label:   false,
              essence_status:     'pending',
            })
          }
        }
      }
    }
  } catch (err: unknown) {
    console.error('[twilio/recording] deposit insert failed:', err instanceof Error ? err.message : err)
  }

  // ── Notification (always) ─────────────────────────────────────────────────────
  try {
    await supabaseAdmin.from('owner_notifications').insert({
      archive_id: archiveId,
      type:       'phone_recording',
      subject:    'New phone recording received',
      sent_to:    archiveId,
      sent_at:    new Date().toISOString(),
      metadata:   { contributorId, duration: recordingDuration, hasTranscript: !!transcript, downloadOk, recordingSid },
    })
  } catch (err: unknown) {
    console.error('[twilio/recording] notification insert failed:', err instanceof Error ? err.message : err)
  }

  // ── Return TwiML (always — Twilio is waiting) ─────────────────────────────────
  const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const continueBase = `${siteUrl}/api/twilio/continue`

  const continueUrl = isOwner
    ? buildActionUrl(continueBase, { archiveId, isOwner: 'true' })
    : buildActionUrl(continueBase, { contributorId, archiveId })

  const { data: archiveLang } = await supabaseAdmin
    .from('archives')
    .select('preferred_language')
    .eq('id', archiveId)
    .maybeSingle()

  const isZh = archiveLang?.preferred_language === 'zh'

  const continuePromptZh = isOwner
    ? '如果您想继续录制，请按1。或者直接挂断电话。'
    : '如果您想回答下一个问题，请按1。或者直接挂断电话。'
  const continuePromptEn = isOwner
    ? 'Would you like to record another memory? Press 1 to continue, or hang up when you are done.'
    : 'Would you like to answer another question? Press 1 to continue, or hang up when you are done.'

  const twiml = isZh
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>谢谢您。您的故事已经保存到档案中了。</Say>
  <Pause length="1"/>
  <Say>${continuePromptZh}</Say>
  <Gather numDigits="1" action="${continueUrl}" method="POST" timeout="10">
  </Gather>
  <Say>谢谢您。再见。</Say>
  <Hangup/>
</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you.</Say>
  <Pause length="1"/>
  <Say voice="alice">Your memory has been saved to the archive.</Say>
  <Pause length="1"/>
  <Say voice="alice">${continuePromptEn}</Say>
  <Gather numDigits="1" action="${continueUrl}" method="POST" timeout="10">
  </Gather>
  <Say voice="alice">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`

  console.log('[twilio/recording] TwiML response:')
  console.log(twiml)
  return twimlResponse(twiml)
}
