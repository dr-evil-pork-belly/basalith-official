import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inngest } from '@/lib/inngest'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { archiveId, storagePath, fileName, fileSize, fileType, uploadedBy } =
      await req.json()

    if (!archiveId || !storagePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: photo, error: dbError } = await supabaseAdmin
      .from('photographs')
      .insert({
        archive_id:     archiveId,
        storage_path:   storagePath,
        original_name:  fileName   || null,
        file_size:      fileSize   || null,
        status:         'pending_ai',
        ai_processed:   false,
        priority_score: 0.5,
      })
      .select()
      .single()

    if (dbError || !photo) {
      throw new Error(dbError?.message || 'Failed to create photo record')
    }

    try {
      await inngest.send({
        name: 'photo/uploaded',
        data: {
          photographId: photo.id,
          archiveId,
          storagePath,
          uploadedBy:   uploadedBy || 'owner',
        },
      })
    } catch (inngestErr: unknown) {
      const msg = inngestErr instanceof Error ? inngestErr.message : String(inngestErr)
      console.error('Inngest error (non-fatal):', msg)
    }

    return NextResponse.json({ success: true, photographId: photo.id })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('register-photo error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
