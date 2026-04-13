import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData      = await req.formData()
    const file          = formData.get('file')          as File
    const archiveId     = formData.get('archiveId')     as string
    const videoType     = formData.get('videoType')     as string
    const createdBy     = formData.get('createdBy')     as string
    const decade        = formData.get('decade')        as string
    const uploaderName  = formData.get('uploaderName')  as string
    const uploaderEmail = formData.get('uploaderEmail') as string
    const title         = (formData.get('title')        as string) || ''

    if (!file || !archiveId) {
      return NextResponse.json({ error: 'Missing file or archiveId' }, { status: 400 })
    }

    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (500MB limit)' }, { status: 400 })
    }

    const mimeType    = file.type
    const ext         = file.name.split('.').pop() || 'bin'
    const storagePath = `${archiveId}/${Date.now()}.${ext}`
    const buffer      = await file.arrayBuffer()

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('archive-videos')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    // Create video record
    const { data: video, error: videoError } = await supabaseAdmin
      .from('archive_videos')
      .insert({
        archive_id:         archiveId,
        storage_path:       storagePath,
        file_name:          file.name,
        file_type:          mimeType,
        video_type:         videoType  || 'other',
        created_by:         createdBy  || 'unknown',
        approximate_decade: decade     || null,
        uploaded_by_name:   uploaderName  || null,
        uploaded_by_email:  uploaderEmail || null,
        title:              title || null,
        file_size:          file.size,
        transcript_status:  'pending',
      })
      .select()
      .single()

    if (videoError || !video) throw new Error('Failed to create video record')

    // Transcribe audio via Whisper (raw fetch — no openai SDK dependency)
    let transcript       = ''
    let languageDetected = ''
    let durationSeconds  = 0

    try {
      const whisperForm = new FormData()
      whisperForm.append('file', new Blob([buffer], { type: mimeType }), file.name)
      whisperForm.append('model', 'whisper-1')
      whisperForm.append('response_format', 'verbose_json')
      // NO language param — auto-detect

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method:  'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body:    whisperForm,
      })

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json()
        transcript        = whisperData.text     || ''
        languageDetected  = whisperData.language || ''
        durationSeconds   = Math.round(whisperData.duration || 0)
      } else {
        const errText = await whisperRes.text()
        console.error('Whisper error:', errText)
      }
    } catch (whisperErr: unknown) {
      console.error('Whisper transcription failed:', whisperErr instanceof Error ? whisperErr.message : whisperErr)
    }

    transcript = transcript.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
    const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length

    // Generate title and summary via Claude
    let summary = ''
    let aiTitle = title

    if (transcript.length > 100) {
      try {
        const analysisRes = await anthropic.messages.create({
          model:      'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{
            role:    'user',
            content: `This is a transcript from a family video archive.
${decade ? `Approximate era: ${decade}` : ''}
${videoType ? `Video type: ${videoType}` : ''}

TRANSCRIPT:
${transcript.substring(0, 3000)}

Return ONLY valid JSON with no markdown fences:
{
  "title": "brief descriptive title for this video",
  "summary": "2-3 sentence summary of what this video captures"
}`,
          }],
        })

        const raw     = analysisRes.content[0].type === 'text' ? analysisRes.content[0].text.trim() : '{}'
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed  = JSON.parse(cleaned)

        summary = parsed.summary || ''
        if (!aiTitle && parsed.title) aiTitle = parsed.title

      } catch (analysisErr: unknown) {
        console.error('Video analysis failed:', analysisErr instanceof Error ? analysisErr.message : analysisErr)
      }
    }

    // Update video record
    await supabaseAdmin
      .from('archive_videos')
      .update({
        transcript,
        transcript_status: transcript ? 'complete' : 'failed',
        word_count:        wordCount,
        language_detected: languageDetected || null,
        duration_seconds:  durationSeconds  || null,
        summary,
        title:             aiTitle || null,
      })
      .eq('id', video.id)

    // Create deposit
    let depositId = null
    if (transcript && wordCount > 10) {
      const depositPrompt =
        videoType === 'home_video'  ? `Home video — ${decade || 'undated'}` :
        videoType === 'interview'   ? `Interview — ${decade || 'undated'}` :
        videoType === 'speech'      ? `Speech or presentation — ${decade || 'undated'}` :
        videoType === 'celebration' ? `Celebration video — ${decade || 'undated'}` :
        `Video recording — ${decade || 'undated'}`

      const { data: deposit } = await supabaseAdmin
        .from('owner_deposits')
        .insert({ archive_id: archiveId, prompt: depositPrompt, response: transcript, essence_status: 'pending', source: 'video_upload' })
        .select()
        .single()

      if (deposit) {
        depositId = deposit.id
        await supabaseAdmin.from('archive_videos').update({ deposit_id: depositId }).eq('id', video.id)
      }
    }

    return NextResponse.json({
      success:         true,
      videoId:         video.id,
      transcript:      transcript.substring(0, 500),
      wordCount,
      languageDetected,
      durationSeconds,
      summary,
      title:           aiTitle,
      depositCreated:  !!depositId,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Video processing error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
