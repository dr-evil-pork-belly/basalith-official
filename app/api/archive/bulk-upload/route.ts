import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inngest } from '@/lib/inngest'

export async function POST(req: NextRequest) {
  console.log('=== BULK UPLOAD START ===')

  try {
    const formData  = await req.formData()
    const archiveId = formData.get('archiveId') as string
    const uploadedBy = formData.get('uploadedBy') as string || 'owner'

    console.log('Archive ID:', archiveId)
    console.log('Uploaded by:', uploadedBy)

    if (!archiveId) {
      console.log('ERROR: No archiveId')
      return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
    }

    const files = formData.getAll('photos') as File[]

    console.log('Files received:', files.length)

    if (!files || files.length === 0) {
      console.log('ERROR: No files')
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files[0]) {
      console.log('First file:', {
        name: files[0].name,
        size: files[0].size,
        type: files[0].type,
      })
    }

    const results: { photographId: string; fileName: string }[] = []
    const errors:  { file: string; error: string }[]            = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`Processing file ${i + 1}/${files.length}:`, file.name)

      try {
        const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${archiveId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`

        console.log('Storage path:', path)

        const buffer = await file.arrayBuffer()
        console.log('Buffer size:', buffer.byteLength)

        const { data: storageData, error: uploadError } = await supabaseAdmin
          .storage
          .from('photographs')
          .upload(path, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          console.log('Storage error:', uploadError.message, uploadError)
          errors.push({ file: file.name, error: uploadError.message })
          continue
        }

        console.log('Storage upload success:', storageData?.path)

        const { data: photo, error: dbError } = await supabaseAdmin
          .from('photographs')
          .insert({
            archive_id:     archiveId,
            storage_path:   path,
            original_name:  file.name,
            file_size:      file.size,
            status:         'pending_ai',
            ai_processed:   false,
            priority_score: 0.5,
          })
          .select()
          .single()

        if (dbError || !photo) {
          console.log('DB error:', dbError?.message, dbError)
          errors.push({ file: file.name, error: dbError?.message || 'DB insert failed' })
          continue
        }

        console.log('DB insert success:', photo.id)

        try {
          await inngest.send({
            name: 'photo/uploaded',
            data: {
              photographId: photo.id,
              archiveId,
              storagePath:  path,
              uploadedBy,
            },
          })
          console.log('Inngest event sent')
        } catch (inngestErr: unknown) {
          const msg = inngestErr instanceof Error ? inngestErr.message : String(inngestErr)
          console.log('Inngest error (non-fatal):', msg)
          // Don't fail upload if Inngest fails
        }

        results.push({ photographId: photo.id, fileName: file.name })

      } catch (fileErr: unknown) {
        const msg   = fileErr instanceof Error ? fileErr.message : String(fileErr)
        const stack = fileErr instanceof Error ? fileErr.stack  : undefined
        console.log('File error:', file.name, msg, stack)
        errors.push({ file: file.name, error: msg })
      }
    }

    console.log('=== BULK UPLOAD COMPLETE ===')
    console.log('Uploaded:', results.length)
    console.log('Failed:', errors.length)
    console.log('Errors:', errors)

    return NextResponse.json({
      success:  true,
      uploaded: results.length,
      failed:   errors.length,
      total:    files.length,
      message:  results.length > 0
        ? `${results.length} photograph${results.length === 1 ? '' : 's'} uploaded successfully.`
        : `Upload failed. ${errors.length} error${errors.length === 1 ? '' : 's'}.`,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error: unknown) {
    const msg   = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack  : undefined
    console.log('=== BULK UPLOAD CRASH ===')
    console.log('Error:', msg)
    console.log('Stack:', stack)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
