import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Lightweight dashboard endpoint for the mobile app.
// Auth: archiveId in query param (validated against DB).

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')

  console.log('[dashboard-mobile] archiveId:', archiveId || 'NOT RECEIVED')
  if (!archiveId) {
    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
  }

  const [archiveRes, photoRes, depositsRes, contribsRes] = await Promise.allSettled([
    supabaseAdmin
      .from('archives')
      .select('id, name, owner_name, status, preferred_language')
      .eq('id', archiveId)
      .single(),

    // Most recent photo regardless of labelling status
    supabaseAdmin
      .from('photographs')
      .select('id, storage_path, ai_era_estimate, status')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(10)
      .maybeSingle(),

    supabaseAdmin
      .from('owner_deposits')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('contributors')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .eq('status', 'active'),
  ])

  const archive  = archiveRes.status  === 'fulfilled' ? archiveRes.value.data   : null
  const deposits = depositsRes.status === 'fulfilled' ? depositsRes.value.count  : 0
  const contribs = contribsRes.status === 'fulfilled' ? contribsRes.value.count  : 0

  if (!archive) {
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  }

  // Get most recent photo that actually has a storage path
  let latestPhoto: { id: string; storage_path: string | null; ai_era_estimate: string | null; status: string | null } | null = null
  if (photoRes.status === 'fulfilled' && photoRes.value.data) {
    const p = photoRes.value.data
    latestPhoto = p
  }

  // If the .maybeSingle() photo has no storage_path, fall back to querying for any with one
  if (!latestPhoto?.storage_path) {
    const { data: fallback } = await supabaseAdmin
      .from('photographs')
      .select('id, storage_path, ai_era_estimate, status')
      .eq('archive_id', archiveId)
      .not('storage_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    latestPhoto = fallback ?? null
  }

  console.log('[dashboard-mobile] archiveId:', archiveId.substring(0, 8),
    '| photo:', latestPhoto?.id ?? 'none found',
    '| status:', latestPhoto?.status ?? '-')

  const todayPhoto = latestPhoto?.storage_path
    ? { id: latestPhoto.id, eraEstimate: latestPhoto.ai_era_estimate ?? null }
    : null

  const response = {
    archiveName:  archive.name        ?? '',
    ownerName:    archive.owner_name  ?? '',
    photoCount:   0,
    depositCount: deposits ?? 0,
    contribCount: contribs ?? 0,
    todayPhoto,
  }

  console.log('[dashboard-mobile] response: photoCount=', response.photoCount,
    'todayPhoto=', todayPhoto?.id ?? 'null')

  return NextResponse.json(response)
}
