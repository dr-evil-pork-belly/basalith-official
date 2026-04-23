import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic   = 'force-dynamic'
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

  const formData          = await req.formData()
  const recordingUrl      = formData.get('RecordingUrl')      as string | null
  const recordingDuration = formData.get('RecordingDuration') as string | null
  const callSid           = formData.get('CallSid')           as string | null

  console.log(`[twilio/recording] sid=${callSid} archiveId=${archiveId} duration=${recordingDuration}s`)

  if (!recordingUrl || !archiveId) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
  }

  try {
    // Wait for Twilio to finish processing the recording
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Download MP3 from Twilio with Basic Auth
    const audioResponse = await fetch(`${recordingUrl}.mp3`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64'),
      },
    })

    if (!audioResponse.ok) {
      throw new Error(`Twilio recording download failed: ${audioResponse.status}`)
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const fileName    = `${archiveId}/phone-${Date.now()}.mp3`

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabaseAdmin
      .storage
      .from('voice-recordings')
      .upload(fileName, audioBuffer, { contentType: 'audio/mp3', upsert: false })

    if (uploadErr) throw new Error(`Storage upload: ${uploadErr.message}`)

    // Transcribe with Whisper
    let transcript = ''
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
      }
    } catch (err) {
      console.error('[twilio/recording] Whisper failed:', err)
    }

    // Save voice_recording row
    await supabaseAdmin.from('voice_recordings').insert({
      archive_id:        archiveId,
      storage_path:      fileName,
      duration_seconds:  parseInt(recordingDuration ?? '0') || 0,
      transcript:        transcript || null,
      transcript_status: transcript ? 'complete' : 'failed',
      prompt:            'Phone call recording',
      mime_type:         'audio/mp3',
    })

    // Persist transcript
    if (transcript && transcript.length > 20) {
      if (isOwner) {
        await supabaseAdmin.from('owner_deposits').insert({
          archive_id:     archiveId,
          prompt:         'Phone call deposit',
          response:       transcript,
          essence_status: 'pending',
          source:         'phone_recording',
        })
      } else {
        const { data: deposit } = await supabaseAdmin
          .from('owner_deposits')
          .insert({
            archive_id:     archiveId,
            prompt:         'Phone call recording',
            response:       transcript,
            essence_status: 'pending',
            source:         'phone_recording',
          })
          .select('id')
          .single()

        const depositId = deposit?.id ?? null

        if (questionId && depositId) {
          await supabaseAdmin
            .from('contributor_questions')
            .update({ status: 'answered', answer_text: transcript, answered_at: new Date().toISOString(), deposit_id: depositId })
            .eq('id', questionId)
        }

        if (contributorId) {
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

    // Notify archive owner
    await supabaseAdmin.from('owner_notifications').insert({
      archive_id: archiveId,
      type:       'phone_recording',
      subject:    'New phone recording received',
      sent_to:    archiveId,
      sent_at:    new Date().toISOString(),
      metadata:   { contributorId, duration: recordingDuration, hasTranscript: !!transcript },
    })

  } catch (err: unknown) {
    console.error('[twilio/recording] Processing failed:', err instanceof Error ? err.message : err)
  }

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

  // No voice attribute for Chinese — Twilio default handles CJK better than alice.
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
