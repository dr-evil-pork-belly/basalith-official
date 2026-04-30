import { supabaseAdmin } from './supabase-admin'

export interface EntityReadinessResult {
  ready: boolean
  score: number
  breakdown: {
    photographs:    number
    deposits:       number
    accuracyAvg:    number
    voiceRecordings: number
  }
  missing: string[]
}

export async function calculateEntityReadiness(
  archiveId: string,
): Promise<EntityReadinessResult> {
  const [photos, deposits, accuracy, voice] = await Promise.all([
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
  ])

  const photoCount   = photos.count   ?? 0
  const depositCount = deposits.count ?? 0
  const voiceCount   = voice.count    ?? 0

  const accuracyScores = accuracy.data?.map(a => a.accuracy_score) ?? []
  const accuracyAvg    = accuracyScores.length
    ? accuracyScores.reduce((a: number, b: number) => a + b, 0) / accuracyScores.length
    : 0

  const photoScore    = Math.min(photoCount / 50 * 30, 30)    // 30 pts max
  const depositScore  = Math.min(depositCount / 20 * 40, 40)  // 40 pts max
  const accuracyScore = Math.min((accuracyAvg / 40) * 20, 20) // 20 pts max
  const voiceScore    = Math.min(voiceCount / 5 * 10, 10)     // 10 pts max

  const totalScore = Math.round(photoScore + depositScore + accuracyScore + voiceScore)

  const missing: string[] = []
  if (photoCount < 50)   missing.push(`${50 - photoCount} more photographs`)
  if (depositCount < 20) missing.push(`${20 - depositCount} more deposits`)
  if (accuracyAvg < 40)  missing.push('More wisdom sessions to improve accuracy')
  if (voiceCount < 5)    missing.push(`${5 - voiceCount} more voice recordings`)

  return {
    ready: totalScore >= 60,
    score: totalScore,
    breakdown: {
      photographs:     photoCount,
      deposits:        depositCount,
      accuracyAvg:     Math.round(accuracyAvg),
      voiceRecordings: voiceCount,
    },
    missing,
  }
}
