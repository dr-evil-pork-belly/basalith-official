import { supabaseAdmin } from './supabase-admin'

export interface EntityReadinessResult {
  ready: boolean
  score: number
  breakdown: {
    photographs:    number
    deposits:       number
    accuracyAvg:    number
    voiceRecordings: number
    wisdomSessions:  number
  }
  missing: string[]
}

// Minimum thresholds — unlock contributor access
export const THRESHOLDS = {
  min: {
    photographs:    500,
    deposits:       100,
    voiceRecordings: 10,
    wisdomSessions:   5,
    accuracyAvg:     50,
  },
  ideal: {
    photographs:    1000,
    deposits:        200,
    voiceRecordings:  25,
    wisdomSessions:   10,
    accuracyAvg:      70,
  },
} as const

// Milestone definitions — used by the dashboard card
export const MILESTONES = [
  {
    id:    1,
    label: 'Foundations',
    criteria: { photographs: 10, deposits: 5 },
  },
  {
    id:    2,
    label: 'Taking Shape',
    criteria: { photographs: 100, deposits: 25, voiceRecordings: 1 },
  },
  {
    id:    3,
    label: 'Recognizable',
    criteria: { photographs: 250, deposits: 50, wisdomSessions: 5 },
  },
  {
    id:    4,
    label: 'Ready to Meet Your Family',
    criteria: { photographs: 500, deposits: 100, voiceRecordings: 10, accuracyAvg: 50 },
  },
] as const

export function getMilestoneStatus(breakdown: EntityReadinessResult['breakdown']) {
  return MILESTONES.map(m => {
    const criteria = m.criteria as Record<string, number>
    const complete  = Object.entries(criteria).every(
      ([k, v]) => (breakdown[k as keyof typeof breakdown] ?? 0) >= v
    )
    return { ...m, complete }
  })
}

export async function calculateEntityReadiness(
  archiveId: string,
): Promise<EntityReadinessResult> {
  const [photos, deposits, accuracy, voice, wisdom] = await Promise.all([
    supabaseAdmin
      .from('photographs')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .in('status', ['unlabelled', 'labelled']),

    supabaseAdmin
      .from('owner_deposits')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('entity_accuracy')
      .select('accuracy_score')
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('voice_recordings')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .eq('transcript_status', 'complete'),

    supabaseAdmin
      .from('wisdom_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .eq('status', 'completed'),
  ])

  const photoCount   = photos.count   ?? 0
  const depositCount = deposits.count ?? 0
  const voiceCount   = voice.count    ?? 0
  const wisdomCount  = wisdom.count   ?? 0

  const accuracyScores = accuracy.data?.map(a => a.accuracy_score) ?? []
  const accuracyAvg    = accuracyScores.length
    ? accuracyScores.reduce((a: number, b: number) => a + b, 0) / accuracyScores.length
    : 0

  // Score calculation — totals 100 pts
  const photoScore    = Math.min(photoCount   / 500 * 30, 30)  // 30 pts
  const depositScore  = Math.min(depositCount / 100 * 40, 40)  // 40 pts
  const voiceScore    = Math.min(voiceCount   / 10  * 15, 15)  // 15 pts
  const wisdomScore   = Math.min(wisdomCount  / 5   * 10, 10)  // 10 pts
  const accuracyScore = Math.min((accuracyAvg / 50) * 5,   5)  //  5 pts

  const totalScore = Math.round(photoScore + depositScore + voiceScore + wisdomScore + accuracyScore)

  const missing: string[] = []
  if (photoCount   < THRESHOLDS.min.photographs)    missing.push(`${THRESHOLDS.min.photographs - photoCount} more photographs`)
  if (depositCount < THRESHOLDS.min.deposits)       missing.push(`${THRESHOLDS.min.deposits - depositCount} more deposits`)
  if (voiceCount   < THRESHOLDS.min.voiceRecordings) missing.push(`${THRESHOLDS.min.voiceRecordings - voiceCount} more voice recordings`)
  if (wisdomCount  < THRESHOLDS.min.wisdomSessions)  missing.push(`${THRESHOLDS.min.wisdomSessions - wisdomCount} more wisdom sessions`)
  if (accuracyAvg  < THRESHOLDS.min.accuracyAvg)    missing.push('Improve entity accuracy with wisdom sessions')

  return {
    ready: totalScore >= 60,
    score: totalScore,
    breakdown: {
      photographs:     photoCount,
      deposits:        depositCount,
      accuracyAvg:     Math.round(accuracyAvg),
      voiceRecordings: voiceCount,
      wisdomSessions:  wisdomCount,
    },
    missing,
  }
}
