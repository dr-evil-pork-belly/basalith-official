import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

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

    // Use .limit(1).maybeSingle() — NOT .limit(10).maybeSingle() which errors on multiple rows
    supabaseAdmin
      .from('photographs')
      .select('id, storage_path, ai_era_estimate, status')
      .eq('archive_id', archiveId)
      .not('storage_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
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

  const archive  = archiveRes.status  === 'fulfilled' ? archiveRes.value.data  : null
  const photo    = photoRes.status    === 'fulfilled' ? photoRes.value.data    : null
  const deposits = depositsRes.status === 'fulfilled' ? depositsRes.value.count : 0
  const contribs = contribsRes.status === 'fulfilled' ? contribsRes.value.count : 0

  if (!archive) {
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  }

  console.log('[dashboard-mobile] photo:', photo?.id ?? 'none', '| status:', photo?.status ?? '-', '| storagePath:', photo?.storage_path ?? 'null')

  // Generate a 1-hour signed URL directly — avoids redirect, works reliably in React Native
  let signedUrl: string | null = null
  if (photo?.storage_path) {
    const { data: signed } = await supabaseAdmin
      .storage
      .from('photographs')
      .createSignedUrl(photo.storage_path, 3600)
    signedUrl = signed?.signedUrl ?? null
  }

  console.log('[dashboard-mobile] signedUrl:', signedUrl ? 'generated' : 'null')

  const todayPhoto = photo?.id
    ? {
        id:          photo.id,
        url:         signedUrl,
        eraEstimate: photo.ai_era_estimate ?? null,
      }
    : null

  return NextResponse.json({
    archiveName:  archive.name       ?? '',
    ownerName:    archive.owner_name ?? '',
    photoCount:   0,
    depositCount: deposits ?? 0,
    contribCount: contribs ?? 0,
    todayPhoto,
  })
}
