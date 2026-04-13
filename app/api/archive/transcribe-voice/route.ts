import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData        = await req.formData()
    const audioFile       = formData.get('audio') as File
    const archiveId       = formData.get('archiveId') as string
    const prompt          = formData.get('prompt') as string || ''
    const durationSeconds = parseInt(formData.get('duration') as string || '0')

    if (!audioFile || !archiveId) {
      return NextResponse.json({ error: 'Missing audio or archiveId' }, { status: 400 })
    }

    // Upload audio to Supabase Storage
    const timestamp   = Date.now()
    const storagePath = `${archiveId}/${timestamp}.webm`
    const audioBuffer = await audioFile.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('voice-recordings')
      .upload(storagePath, audioBuffer, {
        contentType: audioFile.type || 'audio/webm',
        upsert:      false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Create voice recording record
    const { data: recording, error: recordingError } = await supabaseAdmin
      .from('voice_recordings')
      .insert({
        archive_id:        archiveId,
        storage_path:      storagePath,
        duration_seconds:  durationSeconds,
        transcript_status: 'pending',
        prompt:            prompt || null,
        file_size:         audioFile.size,
        mime_type:         audioFile.type || 'audio/webm',
      })
      .select()
      .single()

    if (recordingError || !recording) {
      throw new Error('Failed to create recording record')
    }

    // Transcribe with OpenAI Whisper
    // DO NOT set language parameter — Whisper auto-detects spoken language.
    // Supports Vietnamese, Cantonese, Spanish, Arabic, Tagalog, Korean,
    // and 95 more languages automatically.
    let transcript       = ''
    let languageDetected = ''

    try {
      const whisperFormData = new FormData()
      whisperFormData.append(
        'file',
        new Blob([audioBuffer], { type: audioFile.type || 'audio/webm' }),
        'recording.webm'
      )
      whisperFormData.append('model', 'whisper-1')
      // verbose_json returns detected language
      whisperFormData.append('response_format', 'verbose_json')
      // NO language parameter — auto-detect for multilingual support

      const whisperResponse = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          body:    whisperFormData,
        }
      )

      if (whisperResponse.ok) {
        const whisperData = await whisperResponse.json()
        transcript       = whisperData.text || ''
        languageDetected = whisperData.language || ''
        console.log('Whisper transcription complete:', {
          language:   languageDetected,
          textLength: transcript.length,
          duration:   whisperData.duration,
        })
      } else {
        const whisperError = await whisperResponse.text()
        console.error('Whisper error:', whisperError)
      }
    } catch (whisperErr: unknown) {
      console.error('Whisper transcription failed:', whisperErr instanceof Error ? whisperErr.message : whisperErr)
    }

    // Update recording with transcript
    await supabaseAdmin
      .from('voice_recordings')
      .update({
        transcript,
        language_detected: languageDetected,
        transcript_status: transcript ? 'complete' : 'failed',
      })
      .eq('id', recording.id)

    // If transcription succeeded, create a deposit
    let depositId = null
    if (transcript && transcript.length > 20) {
      const depositPrompt = prompt || 'Voice recording'

      const { data: deposit } = await supabaseAdmin
        .from('owner_deposits')
        .insert({
          archive_id:     archiveId,
          prompt:         depositPrompt,
          response:       transcript,
          essence_status: 'pending',
          source:         'voice_recording',
        })
        .select()
        .single()

      if (deposit) {
        depositId = deposit.id
        await supabaseAdmin
          .from('voice_recordings')
          .update({ deposit_id: depositId })
          .eq('id', recording.id)
      }
    }

    return NextResponse.json({
      success:           true,
      recordingId:       recording.id,
      transcript,
      languageDetected,
      transcriptStatus:  transcript ? 'complete' : 'failed',
      depositCreated:    !!depositId,
      durationSeconds,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Voice recording error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
