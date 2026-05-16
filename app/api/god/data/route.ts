import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function GET(req: NextRequest) {
  if (!validateGodAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()

  const [
    archivesRes,
    photosRes,
    contribsRes,
    depositsRes,
    entityConvosRes,
    accuracyRes,
    notificationsRes,
    labelsRes,
    prospectsRes,
    commissionsRes,
    voiceRes,
    videosRes,
    trainingPairsRes,
  ] = await Promise.allSettled([
    supabaseAdmin.from('archives').select('id, name, family_name, owner_name, owner_email, tier, status, created_at, magic_link_token, paused_at, scheduled_deletion_at, termination_requested_at, elevenlabs_voice_id, voice_samples_count'),
    supabaseAdmin.from('photographs').select('archive_id, status, created_at').order('created_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('contributors').select('archive_id, status, name, created_at'),
    supabaseAdmin.from('owner_deposits').select('archive_id, created_at'),
    supabaseAdmin.from('entity_conversations').select('archive_id, created_at').order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('entity_accuracy').select('archive_id, accuracy_score'),
    supabaseAdmin.from('owner_notifications').select('archive_id, type, created_at').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('labels').select('archive_id, labelled_by, created_at').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('prospects').select('stage, tier_sold, status, created_at'),
    supabaseAdmin.from('commissions').select('amount, commission_type, status, created_at'),
    supabaseAdmin.from('voice_recordings').select('archive_id, created_at, transcript_status, duration_seconds').order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('archive_videos').select('archive_id, created_at').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('training_pairs').select('archive_id, included_in_training, quality_score, source_type'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? (r.value.data ?? []) : []

  const archives      = get(archivesRes)
  const photos        = get(photosRes)
  const contribs      = get(contribsRes)
  const deposits      = get(depositsRes)
  const entityConvos  = get(entityConvosRes)
  const accuracy      = get(accuracyRes)
  const notifications = get(notificationsRes)
  const labels        = get(labelsRes)
  const prospects     = get(prospectsRes)
  const commissions   = get(commissionsRes)
  const voiceRecs     = get(voiceRes)
  const videos        = get(videosRes)
  const trainingAll   = get(trainingPairsRes)

  // Archive name lookup
  const archiveNames: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of archives) archiveNames[a.id] = a.name

  // Live voice sample count — qualifying recordings per archive
  // (transcript_status=complete AND duration_seconds>=30)
  // Used instead of the cached column so God Mode always shows truth
  const liveVoiceCount: Record<string, number> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const vr of voiceRecs) {
    if (vr.transcript_status === 'complete' && (vr.duration_seconds ?? 0) >= 30) {
      liveVoiceCount[vr.archive_id] = (liveVoiceCount[vr.archive_id] ?? 0) + 1
    }
  }

  // Build per-archive data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const archiveData = archives.map((archive: any) => {
    const id = archive.id
    const daysSinceCreated = (now - new Date(archive.created_at).getTime()) / (1000 * 60 * 60 * 24)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const archivePhotos   = photos.filter((p: any) => p.archive_id === id)
    const photoCount      = archivePhotos.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labeledCount    = archivePhotos.filter((p: any) => p.status === 'labeled' || p.status === 'complete').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contributorCount = contribs.filter((c: any) => c.archive_id === id && c.status === 'active').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const depositCount     = deposits.filter((d: any) => d.archive_id === id).length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entityConvoCount = entityConvos.filter((e: any) => e.archive_id === id).length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const archiveAccuracy  = accuracy.filter((a: any) => a.archive_id === id)
    const entityDepth = archiveAccuracy.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? Math.round(archiveAccuracy.reduce((s: number, a: any) => s + (a.accuracy_score ?? 0), 0) / archiveAccuracy.length * 100)
      : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const archiveNotifs   = notifications.filter((n: any) => n.archive_id === id)
    const lastEmailSent   = archiveNotifs[0]?.created_at ?? null
    const daysSinceEmail  = lastEmailSent ? (now - new Date(lastEmailSent).getTime()) / (1000 * 60 * 60 * 24) : Infinity

    const alerts: Array<{ severity: 'critical' | 'warning' | 'info'; message: string; action: string; actionUrl: string }> = []

    if (photoCount === 0 && daysSinceCreated > 1) {
      alerts.push({
        severity:  'warning',
        message:   `No photos uploaded (day ${Math.floor(daysSinceCreated)})`,
        action:    'Send nudge',
        actionUrl: `/api/god/email?archiveId=${id}&type=no_photos`,
      })
    }
    if (contributorCount === 0) {
      alerts.push({
        severity:  'critical',
        message:   'No contributors added',
        action:    'Email owner',
        actionUrl: `mailto:${archive.owner_email}`,
      })
    }
    if (entityConvoCount === 0 && daysSinceCreated > 3) {
      alerts.push({
        severity:  'warning',
        message:   'No entity conversations yet',
        action:    'Send entity intro',
        actionUrl: `/api/god/email?archiveId=${id}&type=entity_intro`,
      })
    }
    if (entityDepth < 10 && daysSinceCreated > 7) {
      alerts.push({
        severity:  'info',
        message:   `Entity depth very low (${entityDepth}%)`,
        action:    'Send wisdom prompt',
        actionUrl: `/api/god/email?archiveId=${id}&type=wisdom_prompt`,
      })
    }
    if (daysSinceEmail > 2 && daysSinceCreated > 3) {
      alerts.push({
        severity:  'warning',
        message:   `No email in ${Math.floor(daysSinceEmail)} days`,
        action:    'Check cron',
        actionUrl: `/api/god/trigger?route=send-photos`,
      })
    }

    let health: 'green' | 'amber' | 'red' = 'green'
    if (photoCount === 0 || (contributorCount === 0 && daysSinceCreated > 2)) {
      health = 'red'
    } else if (entityConvoCount === 0 || contributorCount === 0) {
      health = 'amber'
    }

    // Training data summary for this archive
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const archiveTraining = trainingAll.filter((t: any) => t.archive_id === id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trainingIncluded = archiveTraining.filter((t: any) => t.included_in_training).length
    const training = {
      total:              archiveTraining.length,
      included:           trainingIncluded,
      readyForFineTuning: trainingIncluded >= 500,
      estimatedAccuracy:
        trainingIncluded < 50   ? 'Building' :
        trainingIncluded < 250  ? 'Developing' :
        trainingIncluded < 500  ? 'Approaching threshold' :
        'Ready for fine-tuning',
    }

    return {
      id,
      name:               archive.name,
      familyName:         archive.family_name,
      ownerName:          archive.owner_name,
      ownerEmail:         archive.owner_email,
      tier:               archive.tier ?? 'unknown',
      status:             archive.status,
      createdAt:          archive.created_at,
      daysSinceCreated:   Math.round(daysSinceCreated),
      photoCount,
      labeledPhotoCount:  labeledCount,
      contributorCount,
      depositCount,
      entityConversations: entityConvoCount,
      lastEmailSent,
      entityDepth,
      health,
      alerts,
      magicLinkToken:           archive.magic_link_token ?? null,
      pausedAt:                 archive.paused_at ?? null,
      scheduledDeletionAt:      archive.scheduled_deletion_at ?? null,
      terminationRequestedAt:   archive.termination_requested_at ?? null,
      elevenlabsVoiceId:        archive.elevenlabs_voice_id ?? null,
      // Prefer live count over cached column — trigger keeps them in sync but live is authoritative
      voiceSamplesCount:        liveVoiceCount[id] ?? archive.voice_samples_count ?? 0,
      training,
    }
  })

  // Global alerts sorted by severity
  const globalAlerts = archiveData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .flatMap((a: any) => a.alerts.map((alert: any) => ({ ...alert, archiveId: a.id, archiveName: a.name })))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => ({ critical: 0, warning: 1, info: 2 }[a.severity as string] ?? 3) - ({ critical: 0, warning: 1, info: 2 }[b.severity as string] ?? 3))

  // Recent activity feed — merge sources and sort by time
  const activityItems: Array<{ timestamp: string; type: string; archiveName: string; description: string }> = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of photos.slice(0, 20))    activityItems.push({ timestamp: p.created_at, type: 'photo_upload',  archiveName: archiveNames[p.archive_id] ?? 'Unknown', description: 'Photo uploaded' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const e of entityConvos.slice(0, 10)) activityItems.push({ timestamp: e.created_at, type: 'entity_chat',   archiveName: archiveNames[e.archive_id] ?? 'Unknown', description: 'Entity conversation' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of labels.slice(0, 10))    activityItems.push({ timestamp: l.created_at, type: 'label_added',   archiveName: archiveNames[l.archive_id] ?? 'Unknown', description: `${l.labelled_by || 'Someone'} labelled a photo` })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const n of notifications.slice(0, 10)) activityItems.push({ timestamp: n.created_at, type: 'email_sent',    archiveName: archiveNames[n.archive_id] ?? 'Unknown', description: `Email: ${n.type || 'notification'}` })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const d of deposits.slice(0, 5))   activityItems.push({ timestamp: d.created_at, type: 'deposit_made',  archiveName: archiveNames[d.archive_id] ?? 'Unknown', description: 'Owner deposit' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const v of videos.slice(0, 5))     activityItems.push({ timestamp: v.created_at, type: 'video_upload',  archiveName: archiveNames[v.archive_id] ?? 'Unknown', description: 'Video uploaded' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of voiceRecs.slice(0, 5))  activityItems.push({ timestamp: r.created_at, type: 'voice_rec',     archiveName: archiveNames[r.archive_id] ?? 'Unknown', description: 'Voice recording' })

  activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Revenue / pipeline
  const activeCount = archives.filter((a: { status: string }) => a.status === 'active').length
  const byTier: Record<string, number> = {}
  for (const a of archives.filter((a: { status: string }) => a.status === 'active')) {
    byTier[a.tier ?? 'unknown'] = (byTier[a.tier ?? 'unknown'] ?? 0) + 1
  }
  const pipelineCount = prospects.filter((p: { stage?: string }) => !['closed_lost', 'archived'].includes(p.stage ?? '')).length

  const today = new Date()
  const emailsSentToday = notifications.filter((n: { created_at: string }) => {
    const d = new Date(n.created_at)
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }).length

  return NextResponse.json({
    archives:       archiveData,
    recentActivity: activityItems.slice(0, 30),
    alerts:         globalAlerts,
    revenue: { activeArchives: activeCount, byTier, pipelineCount },
    system:  { emailsSentToday, apiHealth: 'healthy' as const },
    fetchedAt: new Date().toISOString(),
  })
}
