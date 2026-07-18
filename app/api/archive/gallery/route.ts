import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { getInAppPhotoUrl } from '@/lib/photo-url'
import { getSessionUser } from '@/lib/auth/getSessionUser'

const PAGE_SIZE = 24

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const decade    = searchParams.get('decade')   || null
  const page      = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  // Auth: Supabase owner session only. Ownership is verified against the archives
  // table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too).
  const session = await getSessionUser()
  if (!session?.archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Build query
  let query = supabaseAdmin
    .from('photographs')
    .select(`
      id,
      created_at,
      storage_path,
      original_name,
      ai_era_estimate,
      status,
      priority_score,
      labels (
        what_was_happening,
        legacy_note,
        year_taken,
        season_taken,
        location,
        people_tagged,
        labelled_by,
        created_at
      )
    `, { count: 'exact' })
    .eq('archive_id', archiveId)
    .in('status', ['unlabelled', 'labelled', 'needs_review', 'pending', 'complete'])
    .order('priority_score', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (decade) {
    query = query.eq('decade', decade)
  }

  const { data, error, count } = await query

  console.log('Gallery fetch:', {
    archiveId,
    page,
    decade,
    photoCount: data?.length ?? 0,
    total:      count,
    error:      error?.message ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate in-app URLs (1 hour — refreshed on page reload)
  const photosWithUrls = await Promise.all(
    (data ?? []).map(async (photo) => {
      if (!photo.storage_path) return { ...photo, signedUrl: null }
      const signedUrl = await getInAppPhotoUrl(photo.storage_path, 3600)
      return { ...photo, signedUrl }
    })
  )

  return NextResponse.json({
    photographs: photosWithUrls,
    total:       count ?? 0,
    page,
    totalPages:  Math.ceil((count ?? 0) / PAGE_SIZE),
  })
}
