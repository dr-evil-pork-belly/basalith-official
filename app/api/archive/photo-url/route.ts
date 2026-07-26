import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { getInAppPhotoUrl } from '@/lib/photo-url'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const photographId = searchParams.get('photographId')

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

  if (!photographId) {
    return NextResponse.json({ error: 'photographId required' }, { status: 400 })
  }

  // The storage path is resolved from the photograph row and scoped to the
  // caller's own archive. This route previously accepted a caller-supplied
  // `path` and signed it with no auth and no archive scoping, which returned a
  // signed URL for any object in the private photographs bucket. No caller ever
  // passed `path`; the only caller (the owner deposit page) sends photographId.
  const { data: photo } = await supabaseAdmin
    .from('photographs')
    .select('storage_path')
    .eq('id', photographId)
    .eq('archive_id', archiveId)
    .maybeSingle()

  if (!photo?.storage_path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = await getInAppPhotoUrl(photo.storage_path, 3600) // 1 hour for in-app display

  if (!url) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url })
}
