import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData      = await req.formData()
    const file          = formData.get('file')          as File
    const archiveId     = formData.get('archiveId')     as string
    const documentType  = formData.get('documentType')  as string
    const createdBy     = formData.get('createdBy')     as string
    const decade        = formData.get('decade')        as string
    const uploaderName  = formData.get('uploaderName')  as string
    const uploaderEmail = formData.get('uploaderEmail') as string
    const title         = (formData.get('title')        as string) || ''

    if (!file || !archiveId) {
      return NextResponse.json({ error: 'Missing file or archiveId' }, { status: 400 })
    }

    const mimeType  = file.type
    const isImage   = mimeType.startsWith('image/')
    const isPDF     = mimeType === 'application/pdf'
    const isText    = mimeType.startsWith('text/') || mimeType.includes('word') || mimeType.includes('document')

    // Upload to Supabase Storage
    const ext         = file.name.split('.').pop() || 'bin'
    const storagePath = `${archiveId}/${Date.now()}.${ext}`
    const buffer      = await file.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('archive-documents')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('archive_documents')
      .insert({
        archive_id:        archiveId,
        storage_path:      storagePath,
        file_name:         file.name,
        file_type:         isImage ? 'image_handwritten' : isPDF ? 'pdf' : 'text',
        document_type:     documentType || 'other',
        created_by:        createdBy   || 'unknown',
        approximate_decade: decade     || null,
        uploaded_by_name:  uploaderName  || null,
        uploaded_by_email: uploaderEmail || null,
        title:             title || null,
        file_size:         file.size,
        transcript_status: 'pending',
      })
      .select()
      .single()

    if (docError || !document) throw new Error('Failed to create document record')

    // Extract text
    let transcript = ''

    if (isImage) {
      const base64 = Buffer.from(buffer).toString('base64')
      const vision = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role:    'user',
          content: [
            {
              type:   'image',
              source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 },
            },
            {
              type: 'text',
              text: `This is a scanned handwritten document from a family archive. Transcribe every word exactly as written, preserving the original text faithfully.

Include paragraph breaks where they appear in the original. If any words are illegible write [illegible] in their place.

Return only the transcribed text — no commentary, no explanation.`,
            },
          ],
        }],
      })
      transcript = vision.content[0].type === 'text' ? vision.content[0].text : ''

    } else if (isText) {
      transcript = await file.text()

    } else if (isPDF) {
      try { transcript = await file.text() } catch { transcript = '' }
    }

    transcript = transcript.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
    const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length

    // Analyze linguistic patterns
    let linguisticPatterns: Record<string, unknown> = {}
    let summary = ''
    let aiTitle = title

    if (transcript.length > 100) {
      try {
        const analysisRes = await anthropic.messages.create({
          model:      'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [{
            role:    'user',
            content: `Analyze this text from a family archive document.

TEXT:
${transcript.substring(0, 3000)}

Return ONLY valid JSON with no markdown fences:
{
  "title": "brief descriptive title",
  "summary": "2-3 sentence summary of what this document contains",
  "topics": ["topic1", "topic2"],
  "tone": "formal|informal|emotional|practical|reflective",
  "distinctive_phrases": ["phrase 1", "phrase 2", "phrase 3"],
  "vocabulary_level": "simple|moderate|sophisticated",
  "writing_style": "one sentence describing this person's writing style"
}`,
          }],
        })

        const raw     = analysisRes.content[0].type === 'text' ? analysisRes.content[0].text.trim() : '{}'
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed  = JSON.parse(cleaned)

        linguisticPatterns = parsed
        summary            = parsed.summary || ''
        if (!aiTitle && parsed.title) aiTitle = parsed.title

      } catch (analysisErr: unknown) {
        console.error('Linguistic analysis failed:', analysisErr instanceof Error ? analysisErr.message : analysisErr)
      }
    }

    // Update document
    await supabaseAdmin
      .from('archive_documents')
      .update({
        transcript,
        transcript_status:   transcript ? 'complete' : 'failed',
        word_count:          wordCount,
        linguistic_patterns: linguisticPatterns,
        summary,
        title:               aiTitle || null,
      })
      .eq('id', document.id)

    // Create deposit
    let depositId = null
    if (transcript && wordCount > 10) {
      const depositPrompt =
        documentType === 'personal_letter'  ? `Personal letter, ${decade || 'undated'}` :
        documentType === 'journal_entry'    ? `Journal entry, ${decade || 'undated'}` :
        documentType === 'email'            ? `Email correspondence, ${decade || 'undated'}` :
        documentType === 'speech'           ? `Speech or presentation, ${decade || 'undated'}` :
        `Written document, ${decade || 'undated'}`

      const { data: deposit } = await supabaseAdmin
        .from('owner_deposits')
        .insert({ archive_id: archiveId, prompt: depositPrompt, response: transcript, essence_status: 'pending' })
        .select()
        .single()

      if (deposit) {
        depositId = deposit.id
        await supabaseAdmin.from('archive_documents').update({ deposit_id: depositId }).eq('id', document.id)
      }
    }

    return NextResponse.json({
      success:            true,
      documentId:         document.id,
      transcript:         transcript.substring(0, 500),
      wordCount,
      summary,
      title:              aiTitle,
      depositCreated:     !!depositId,
      linguisticPatterns,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Document processing error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
