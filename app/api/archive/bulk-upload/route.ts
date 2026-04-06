import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inngest } from '@/lib/inngest'

// POST /api/archive/bulk-upload
// Accepts multipart/form-data with fields:
//   archiveId: string
//   uploadedBy: string (optional)
//   photos: File[] (the actual image files)
//
// Uploads each file to Storage, creates photograph records,
// fires Inngest filter agent for each. Returns immediately.

export async function POST(req: NextRequest) {
  try {
    const formData   = await req.formData()
    const archiveId  = formData.get('archiveId')  as string | null
    const uploadedBy = formData.get('uploadedBy') as string | null || 'contributor'

    if (!archiveId) {
      return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
    }

    const files = formData.getAll('photos') as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    console.log(`Bulk upload: ${files.length} files for archive ${archiveId}`)

    const results: { photographId: string; fileName: string }[] = []
    const errors:  { file: string; error: string }[]            = []

    for (const file of files) {
      try {
        const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${archiveId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

        const buffer = await file.arrayBuffer()

        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('photographs')
          .upload(path, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert:      false,
          })

        if (uploadError) {
          errors.push({ file: file.name, error: uploadError.message })
          continue
        }

        const { data: photo, error: dbError } = await supabaseAdmin
          .from('photographs')
          .insert({
            archive_id:    archiveId,
            storage_path:  path,
            original_name: file.name,
            file_size:     file.size,
            status:        'pending_ai',
            ai_processed:  false,
            priority_score: 0.5,
          })
          .select('id')
          .single()

        if (dbError || !photo) {
          errors.push({ file: file.name, error: dbError?.message || 'DB insert failed' })
          continue
        }

        // Fire filter agent — background, non-blocking
        inngest.send({
          name: 'photo/uploaded',
          data: {
            photographId: photo.id,
            archiveId,
            storagePath:  path,
            uploadedBy,
          },
        }).catch(() => {})

        results.push({ photographId: photo.id, fileName: file.name })

      } catch (fileErr: any) {
        errors.push({ file: file.name, error: fileErr.message })
      }
    }

    return NextResponse.json({
      success:  true,
      uploaded: results.length,
      failed:   errors.length,
      total:    files.length,
      message:  `${results.length} photograph${results.length === 1 ? '' : 's'} uploaded. Our AI is analyzing them now. Check your gallery in 15–20 minutes.`,
      errors:   errors.length > 0 ? errors : undefined,
    })

  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
