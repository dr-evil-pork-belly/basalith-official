import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/archive/bulk-upload
// Registers multiple photographs that have already been uploaded to Storage.
// Body: { archiveId: string, files: Array<{ storagePath, originalName, mimeType, sizeBytes }> }

export async function POST(req: NextRequest) {
  try {
    const body      = await req.json()
    const { archiveId, files } = body

    if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files array required' }, { status: 400 })
    }

    const rows = files.map((f: {
      storagePath:  string
      originalName: string
      mimeType?:    string
      sizeBytes?:   number
    }) => ({
      archive_id:    archiveId,
      storage_path:  f.storagePath,
      original_name: f.originalName,
      file_size:     f.sizeBytes ?? null,
      status:        'unlabelled',
    }))

    const { data, error } = await supabaseAdmin
      .from('photographs')
      .insert(rows)
      .select('id, storage_path, original_name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update archive total_photos count
    await supabaseAdmin
      .from('archives')
      .update({ total_photos: supabaseAdmin.rpc as unknown as number })
      .eq('id', archiveId)

    // Use a simple increment via raw SQL instead
    await supabaseAdmin.rpc('increment_total_photos', {
      archive_id: archiveId,
      amount:     rows.length,
    }).maybeSingle()

    return NextResponse.json({
      success: true,
      inserted: data?.length ?? 0,
      photographs: data ?? [],
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
