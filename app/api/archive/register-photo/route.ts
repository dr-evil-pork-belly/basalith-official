import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inngest } from '@/lib/inngest'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too).
    const session = await getSessionUser()
    if (!session?.archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const archiveId = session.archiveId

    const { data: ownerRow } = await supabaseAdmin
      .from('archives')
      .select('owner_user_id')
      .eq('id', archiveId)
      .maybeSingle()
    if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { storagePath, fileName, fileSize, fileType, uploadedBy } =
      await req.json()

    if (!storagePath) {
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
