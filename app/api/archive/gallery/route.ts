import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

const PAGE_SIZE = 24

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  const decade    = searchParams.get('decade')   || null
  const page      = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  if (!archiveId || archiveId === 'will-be-set-after-db-setup') {
    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
  }

  // Build query
  let query = supabaseAdmin
    .from('photographs')
    .select(`
      id,
      created_at,
      storage_path,
      original_name,
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
    .in('status', ['unlabelled', 'labelled', 'needs_review'])
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

  // Generate signed URLs for all photos with storage paths
  const photosWithUrls = await Promise.all(
    (data ?? []).map(async (photo) => {
      if (!photo.storage_path) return { ...photo, signedUrl: null }
      const { data: urlData } = await supabaseAdmin
        .storage
        .from('photographs')
        .createSignedUrl(photo.storage_path, 3600)
      return { ...photo, signedUrl: urlData?.signedUrl ?? null }
    })
  )

  return NextResponse.json({
    photographs: photosWithUrls,
    total:       count ?? 0,
    page,
    totalPages:  Math.ceil((count ?? 0) / PAGE_SIZE),
  })
}
