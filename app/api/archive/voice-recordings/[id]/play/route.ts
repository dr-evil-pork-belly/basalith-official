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

    // Scoped to the caller's own archive. A recording id alone is not authority
    // to mint a signed media URL.
    const { data: recording, error: fetchError } = await supabaseAdmin
      .from('voice_recordings')
      .select('storage_path, archive_id')
      .eq('id', id)
      .eq('archive_id', archiveId)
      .single()

    if (fetchError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    // Create 1-hour signed URL
    const { data: signed, error: signError } = await supabaseAdmin
      .storage
      .from('voice-recordings')
      .createSignedUrl(recording.storage_path, 3600)

    if (signError || !signed?.signedUrl) {
      throw new Error(signError?.message || 'Failed to create signed URL')
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Voice recording play error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
