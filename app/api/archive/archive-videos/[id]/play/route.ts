import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: video, error } = await supabaseAdmin
      .from('archive_videos')
      .select('storage_path')
      .eq('id', id)
      .single()

    if (error || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const { data: signedData, error: signedError } = await supabaseAdmin
      .storage
      .from('archive-videos')
      .createSignedUrl(video.storage_path, 3600)

    if (signedError || !signedData) {
      return NextResponse.json({ error: 'Failed to generate play URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
