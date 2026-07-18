import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inngest } from '@/lib/inngest'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

// Photo upload — accepts multipart/form-data with a 'file' field.
// Auth: Supabase owner session only. Ownership is verified against the archives
// table — a session carrying an archiveId is not proof of ownership
// (getSessionUser fills archiveId for successors too).

export async function POST(req: NextRequest) {
  try {
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

    // Verify archive exists and is active
    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('id, status, total_photos')
      .eq('id', archiveId)
      .maybeSingle()

    if (!archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
    }
    if (archive.status && archive.status !== 'active') {
      return NextResponse.json({ error: 'Archive is not active' }, { status: 403 })
    }

    const formData = await req.formData()
    const file     = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 50 MB limit — accommodates iPhone HEIC and large JPEGs
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    console.log('[upload] file:', file.name, '| type:', file.type, '| size:', sizeMB + 'MB')
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 })
    }

    // Determine extension from MIME or filename
    const mime    = file.type || 'image/jpeg'
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg':  'jpg',
      'image/png':  'png',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'image/webp': 'webp',
    }
    const ext  = extMap[mime] ?? file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${archiveId}/${crypto.randomUUID()}.${ext}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('photographs')
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
      })

    if (storageError) {
      console.error('[upload] storage error:', storageError)
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    // Create photograph record
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photographs')
      .insert({
        archive_id:    archiveId,
        storage_path:  path,
        original_name: file.name || null,
        status:        'pending',
      })
      .select('id')
      .single()

    if (photoError) {
      console.error('[upload] db error:', photoError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Fire processing pipeline (background — non-fatal)
    inngest.send({
      name: 'photo/uploaded',
      data: {
        photographId: photo.id,
        archiveId,
        storagePath:  path,
        uploadedBy:   'owner',
      },
    }).catch(() => {})

    // Update archive total_photos
    await supabaseAdmin
      .from('archives')
      .update({ total_photos: (archive.total_photos ?? 0) + 1 })
      .eq('id', archiveId)

    return NextResponse.json({ success: true, photographId: photo.id })

  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
