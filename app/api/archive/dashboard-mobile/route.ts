import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTodaysSpark } from '@/lib/dailySparks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')

  console.log('[dashboard-mobile] archiveId:', archiveId || 'NOT RECEIVED')
  if (!archiveId) {
    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
  }

  const today = new Date().toISOString().substring(0, 10) // "2026-05-19"

  const [archiveRes, depositsRes, contribsRes, sparkAnswerRes, sentPhotosRes] = await Promise.allSettled([
    supabaseAdmin
      .from('archives')
      .select('id, name, owner_name, status, preferred_language')
      .eq('id', archiveId)
      .single(),

    supabaseAdmin
      .from('owner_deposits')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('contributors')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .eq('status', 'active'),

    // Check if owner already answered a spark today
    supabaseAdmin
      .from('owner_deposits')
      .select('id, prompt')
      .eq('archive_id', archiveId)
      .eq('source_type', 'spark')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .limit(1)
      .maybeSingle(),

    // Photos the owner has already seen in the app (or received by email)
    supabaseAdmin
      .from('owner_photo_sends')
      .select('photograph_id')
      .eq('archive_id', archiveId),
  ])

  const archive         = archiveRes.status        === 'fulfilled' ? archiveRes.value.data        : null
  const deposits        = depositsRes.status        === 'fulfilled' ? depositsRes.value.count       : 0
  const contribs        = contribsRes.status        === 'fulfilled' ? contribsRes.value.count       : 0
  const todaySparkEntry = sparkAnswerRes.status     === 'fulfilled' ? sparkAnswerRes.value.data     : null
  const sentRows        = sentPhotosRes.status      === 'fulfilled' ? (sentPhotosRes.value.data ?? []) : []

  if (!archive) {
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  }

  // ── Spark ────────────────────────────────────────────────────────────────────
  const sparkAnsweredToday = !!todaySparkEntry
  const spark = getTodaysSpark(false, archive.owner_name ?? '')
  console.log('[dashboard-mobile] spark:', spark?.text?.substring(0, 50) ?? 'NULL', '| answered today:', sparkAnsweredToday)

  // ── Photo rotation ───────────────────────────────────────────────────────────
  const seenIds = sentRows.map(r => r.photograph_id).filter(Boolean) as string[]

  async function fetchNextPhoto(excludeIds: string[]) {
    let query = supabaseAdmin
      .from('photographs')
      .select('id, storage_path, ai_era_estimate, status')
      .eq('archive_id', archiveId)
      .not('storage_path', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (excludeIds.length > 0) {
      // Supabase .not('id','in',...) requires the PostgreSQL array literal syntax
      query = (supabaseAdmin
        .from('photographs')
        .select('id, storage_path, ai_era_estimate, status')
        .eq('archive_id', archiveId)
        .not('storage_path', 'is', null)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()) as typeof query
    }

    return query
  }

  let { data: photo } = await fetchNextPhoto(seenIds)

  // All photos seen — reset and start over
  if (!photo && seenIds.length > 0) {
    console.log('[dashboard-mobile] all photos seen, resetting owner_photo_sends')
    await supabaseAdmin.from('owner_photo_sends').delete().eq('archive_id', archiveId)
    const { data: firstPhoto } = await fetchNextPhoto([])
    photo = firstPhoto
  }

  console.log('[dashboard-mobile] photo:', photo?.id ?? 'none', '| status:', photo?.status ?? '-')

  // Record this photo as seen (non-fatal)
  if (photo?.id) {
    supabaseAdmin
      .from('owner_photo_sends')
      .insert({ archive_id: archiveId, photograph_id: photo.id, sent_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.warn('[dashboard-mobile] photo send record failed:', error.message)
      })
  }

  // Generate signed URL
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
    ? { id: photo.id, url: signedUrl, eraEstimate: photo.ai_era_estimate ?? null }
    : null

  return NextResponse.json({
    archiveName:        archive.name       ?? '',
    ownerName:          archive.owner_name ?? '',
    preferredLanguage:  archive.preferred_language ?? 'en',
    photoCount:         0,
    depositCount:       deposits ?? 0,
    contribCount:       contribs ?? 0,
    todayPhoto,
    currentSpark:       sparkAnsweredToday ? null : (spark?.text ?? null),
    currentSparkId:     sparkAnsweredToday ? null : (spark?.id  ?? null),
    sparkAnsweredToday,
  })
}
