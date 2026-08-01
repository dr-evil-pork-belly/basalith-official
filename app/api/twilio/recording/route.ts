import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairsFromVoice } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { verifyTwilioRequest, twilioForbidden } from '@/lib/twilioSignature'

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

// Download a Twilio recording MP3 with up to maxRetries attempts.
// Passes baseUrl (without .mp3) and appends the format suffix internally.
// Waits longer between each retry to give Twilio time to process.
async function downloadRecording(
  baseUrl: string,
  accountSid: string,
  authToken: string,
  maxRetries = 3,
): Promise<ArrayBuffer | null> {
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const url        = `${baseUrl}.mp3`

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      const waitMs = attempt * 3000   // 3s, 6s, 9s
      console.log(`[twilio/recording] attempt ${attempt}/${maxRetries} — waiting ${waitMs}ms`)
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }

    console.log(`[twilio/recording] download attempt ${attempt}/${maxRetries}: ${url}`)

    const response = await fetch(url, { headers: { Authorization: authHeader } })

    console.log(`[twilio/recording] attempt ${attempt} status: ${response.status} ${response.statusText}`)

    if (response.ok) {
      return await response.arrayBuffer()
    }

    if (response.status === 404) {
      console.log('[twilio/recording] 404 — recording not ready yet, retrying')
      continue
    }

    if (response.status === 401) {
      console.error('[twilio/recording] 401 — auth failed, check TWILIO_AUTH_TOKEN in Vercel env vars')
      continue   // might be a timing issue; retry anyway
    }

    console.error(`[twilio/recording] unexpected status ${response.status}, retrying`)
  }

  return null
}

// The TwiML that closes a recording turn: thank the caller, then offer another
// recording through /api/twilio/continue. Extracted because the duplicate
// delivery path returns exactly this and writes nothing.
async function buildContinueTwiml(
  archiveId: string,
  isOwner: boolean,
  contributorId: string,
): Promise<string> {
  const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
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

  return isZh
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Zhiyu">谢谢您。您的故事已经保存到档案中了。</Say>
  <Pause length="1"/>
  <Say voice="Polly.Zhiyu">${continuePromptZh}</Say>
  <Gather numDigits="1" action="${continueUrl}" method="POST" timeout="10">
  </Gather>
  <Say voice="Polly.Zhiyu">谢谢您。再见。</Say>
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
}

export async function POST(req: NextRequest) {
  // Parse, verify, then act. Verification is the first statement in the handler.
  // Nothing below runs on an unverified request: no recording download, no
  // Supabase read, no write, and no use of the archiveId in the query string.
  // On this route the query string is the whole authorization story, so reading
  // it before the signature check would be trusting a forger's own input.
  const verified = await verifyTwilioRequest(req)
  if (!verified.ok) return twilioForbidden('twilio/recording', verified.reason)
  const params = verified.params

  // ── Credential sanity check (visible in Vercel logs) ─────────────────────────
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
  const authToken  = process.env.TWILIO_AUTH_TOKEN  ?? ''
  console.log(
    '[twilio/recording] credentials check —',
    'SID length:', accountSid.length,
    'SID prefix:', accountSid.substring(0, 4),
    'token length:', authToken.length,
  )
  // SID should be 34 chars starting with 'AC'; token should be 32 chars.

  const { searchParams } = new URL(req.url)
  const contributorId    = searchParams.get('contributorId') ?? ''
  const questionId       = searchParams.get('questionId')    ?? ''
  const archiveId        = searchParams.get('archiveId')     ?? ''
  const isOwner          = searchParams.get('isOwner') === 'true'

  console.log('[twilio/recording] archiveId from params:', archiveId)
  console.log('[twilio/recording] isOwner:', isOwner)
  console.log('[twilio/recording] contributorId:', contributorId)

  // Log every param Twilio sends so we can see the exact URLs and SIDs.
  console.log('[twilio/recording] all params:')
  for (const [key, value] of Object.entries(params)) {
    console.log(`  ${key}: ${value}`)
  }

  const recordingUrl      = params['RecordingUrl']      ?? null
  const recordingSid      = params['RecordingSid']      ?? null
  const recordingDuration = params['RecordingDuration'] ?? null
  const callSid           = params['CallSid']           ?? null

  console.log(`[twilio/recording] sid=${callSid} archiveId=${archiveId} duration=${recordingDuration}s recordingSid=${recordingSid}`)

  if (!archiveId) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
  }

  // ── Idempotency: one recording, one row ───────────────────────────────────────
  // Twilio delivers this webhook more than once. Eight RecordingSid values are
  // already stored twice in voice_recordings, so a second delivery used to
  // duplicate the recording, the deposit, and the notification.
  //
  // This is a code-level check on purpose. A UNIQUE index on
  // twilio_recording_sid would fail to create while those eight duplicate pairs
  // exist, and removing them is a separate decision that has not been made. Do
  // not "improve" this into a migration without clearing the duplicates first.
  //
  // The check sits above the download rather than beside the insert, so a repeat
  // delivery also skips the Twilio fetch, the storage upload and the Whisper
  // call. maybeSingle() is reached through limit(1) because the existing
  // duplicate pairs would otherwise make it error on multiple rows.
  if (recordingSid) {
    const { data: alreadyStored } = await supabaseAdmin
      .from('voice_recordings')
      .select('id')
      .eq('twilio_recording_sid', recordingSid)
      .limit(1)
      .maybeSingle()

    if (alreadyStored) {
      console.log(`[twilio/recording] duplicate delivery for ${recordingSid}, existing row ${alreadyStored.id}, writing nothing`)
      return twimlResponse(await buildContinueTwiml(archiveId, isOwner, contributorId))
    }
  }

  // ── Download + process (non-fatal — always return TwiML) ─────────────────────
  let storagePath = ''
  let transcript  = ''
  let downloadOk  = false

  try {
    // Give Twilio 5 seconds to finish encoding before the first attempt.
    console.log('[twilio/recording] waiting 5s for Twilio to process recording')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Build base URL from RecordingSid (more reliable than RecordingUrl).
    const baseUrl = recordingSid && accountSid
      ? `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}`
      : recordingUrl ?? null

    if (!baseUrl) {
      throw new Error('No RecordingSid or RecordingUrl — cannot download')
    }

    const audioBuffer = await downloadRecording(baseUrl, accountSid, authToken)

    if (!audioBuffer) {
      throw new Error('All download attempts failed')
    }

    const fileName = `${archiveId}/phone-${Date.now()}.mp3`

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
        console.log(`[twilio/recording] transcript (${transcript.length} chars): ${transcript.slice(0, 120)}`)
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
  // The id is held so the training-pair step can name this exact recording
  // instead of re-reading "the archive's newest row", which is a race when two
  // deliveries land close together.
  let voiceRecordingId: string | null = null

  try {
    console.log('[twilio/recording] saving voice_recordings row — archiveId:', archiveId, 'downloadOk:', downloadOk, 'transcriptLen:', transcript.length)
    const { data: vrRow, error: vrError } = await supabaseAdmin
      .from('voice_recordings')
      .insert({
        archive_id:           archiveId,
        storage_path:         storagePath || `pending/${recordingSid ?? 'unknown'}`,
        duration_seconds:     parseInt(recordingDuration ?? '0') || 0,
        transcript:           transcript || null,
        transcript_status:    downloadOk ? (transcript ? 'complete' : 'failed') : 'pending',
        prompt:               'Phone call recording',
        mime_type:            'audio/mp3',
        twilio_recording_sid: recordingSid ?? null,
      })
      .select('id')
      .single()
    voiceRecordingId = vrRow?.id ?? null
    console.log('[twilio/recording] voice_recordings saved:', vrRow?.id)
    if (vrError) console.error('[twilio/recording] voice_recordings error:', vrError.message, vrError.details, vrError.hint)
  } catch (err: unknown) {
    console.error('[twilio/recording] voice_recordings insert failed:', err instanceof Error ? err.message : err)
  }

  // ── Save deposit / labels (always — transcript or placeholder) ────────────────
  try {
    const depositText = transcript && transcript.length > 20
      ? transcript
      : downloadOk
        ? null   // downloaded but Whisper gave nothing — skip
        : `[Voice recording — ${recordingDuration ?? '?'} seconds — transcription pending. RecordingSid: ${recordingSid ?? 'unknown'}]`

    console.log('[twilio/recording] deposit — archiveId:', archiveId, 'isOwner:', isOwner, 'transcriptLen:', transcript.length, 'depositText?', !!depositText)

    if (depositText) {
      if (isOwner) {
        console.log('[twilio/recording] saving owner deposit — archiveId:', archiveId)
        // source_type was 'phone_call', which owner_deposits rejects. Twenty-six
        // phone calls produced zero deposits while every caller heard a
        // confirmation, because the insert error was logged and swallowed. The
        // owner voice path writes 'deposit', confirmed against live rows.
        const { data: deposit, error: depositError } = await supabaseAdmin
          .from('owner_deposits')
          .insert({
            archive_id:     archiveId,
            prompt:         'Phone call deposit',
            response:       depositText,
            source_type:    'deposit',
            essence_status: 'pending',
          })
          .select()
          .single()
        console.log('[twilio/recording] deposit saved:', deposit?.id)
        if (depositError) {
          console.error('[twilio/recording] DEPOSIT FAILED:', depositError.message, depositError.details, depositError.hint)
        } else if (deposit?.id) {
          // after(), not void. A bare fire-and-forget dies on Vercel lambda
          // freeze the moment the TwiML response resolves, so the classification
          // never ran in production. after() defers the work until the response
          // is sent and keeps the instance alive until it settles.
          const depositId = deposit.id
          after(() =>
            classifyDeposit({ depositId, archiveId, text: depositText })
              .catch(e => console.warn('[twilio/recording] classifyDeposit failed:', e instanceof Error ? e.message : e)),
          )
        }
      } else {
        console.log('[twilio/recording] saving contributor deposit — archiveId:', archiveId)
        // 'contributor' is the value the live contributor path writes
        // (app/api/contribute/answer). contributor_id is set here too, so this
        // row is attributable and stays out of the owner's coverage map, which
        // is why it is deliberately not classified.
        const { data: deposit, error: depositError } = await supabaseAdmin
          .from('owner_deposits')
          .insert({
            archive_id:     archiveId,
            prompt:         'Phone call recording',
            response:       depositText,
            source_type:    'contributor',
            contributor_id: contributorId || null,
            essence_status: 'pending',
          })
          .select('id')
          .single()

        console.log('[twilio/recording] contributor deposit saved:', deposit?.id)
        if (depositError) {
          console.error('[twilio/recording] DEPOSIT FAILED:', depositError.message, depositError.details, depositError.hint)
        }

        const depositId = deposit?.id ?? null

        if (questionId && depositId && transcript) {
          await supabaseAdmin
            .from('contributor_questions')
            .update({
              status:      'answered',
              answer_text: transcript,
              answered_at: new Date().toISOString(),
              deposit_id:  depositId,
            })
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
    } else {
      console.log('[twilio/recording] no depositText — skipping deposit insert')
    }
  } catch (err: unknown) {
    console.error('[twilio/recording] deposit insert failed:', err instanceof Error ? err.message : err)
  }

  // ── Training pairs from phone voice ──────────────────────────────────────────
  // after(), not void. The old dispatch was a bare `void Promise.resolve(...)`,
  // which dies on Vercel lambda freeze the moment the TwiML response resolves.
  // Every training pair that exists for a phone recording was written by a
  // backfill on 2026-05-03, days after the call, so this step has never
  // completed inline in production.
  //
  // It also names the row this request just inserted rather than re-reading the
  // archive's newest recording, which was a race between two close deliveries.
  if (isOwner && transcript && transcript.length > 50 && voiceRecordingId) {
    const recordingId  = voiceRecordingId
    const voiceTranscript = transcript
    after(async () => {
      try {
        const { data: arch } = await supabaseAdmin
          .from('archives')
          .select('owner_name, name, preferred_language')
          .eq('id', archiveId)
          .single()
        if (!arch) return
        await createTrainingPairsFromVoice(
          { id: recordingId, archive_id: archiveId, transcript: voiceTranscript, prompt: 'Phone call recording' },
          arch.owner_name || 'Unknown',
          arch.name,
          arch.preferred_language || 'en',
        )
        console.log('[twilio/recording] training pairs complete for recording', recordingId)
      } catch (e: unknown) {
        console.warn('[twilio/recording] training pairs failed:', e instanceof Error ? e.message : e)
      }
    })
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
  const twiml = await buildContinueTwiml(archiveId, isOwner, contributorId)

  console.log('[twilio/recording] TwiML response:')
  console.log(twiml)
  return twimlResponse(twiml)
}
