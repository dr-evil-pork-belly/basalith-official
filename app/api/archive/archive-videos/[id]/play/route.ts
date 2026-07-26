import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Scoped to the caller's own archive. A video id alone is not authority to
    // mint a signed media URL.
    const { data: video, error } = await supabaseAdmin
      .from('archive_videos')
      .select('storage_path')
      .eq('id', id)
      .eq('archive_id', archiveId)
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
