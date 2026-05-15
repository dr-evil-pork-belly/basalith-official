import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function estimateDecade(eraStr: string | null): number | null {
  if (!eraStr) return null
  const m = eraStr.match(/\b(19\d0|20[012]\d|1[6-9]\d0)\b/) || eraStr.match(/\b(\d{4})\b/)
  if (!m) return null
  const year = parseInt(m[1])
  return Math.floor(year / 10) * 10
}

export async function GET() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    { data: archive },
    { data: photos },
    { data: deposits },
    { data: voice },
    { data: dates },
    { data: trainingPairs },
  ] = await Promise.all([
    supabaseAdmin.from('archives').select('owner_name, created_at, owner_birth_year, owner_birth_decade').eq('id', archiveId).single(),
    supabaseAdmin.from('photographs').select('id, ai_era_estimate, status, decade').eq('archive_id', archiveId),
    supabaseAdmin.from('owner_deposits').select('id, created_at').eq('archive_id', archiveId),
    supabaseAdmin.from('voice_recordings').select('id, created_at, duration_seconds').eq('archive_id', archiveId).eq('transcript_status', 'complete'),
    supabaseAdmin.from('significant_dates').select('id, person_name, date_type, month, day, year, label').eq('archive_id', archiveId).eq('active', true),
    supabaseAdmin.from('training_pairs').select('id').eq('archive_id', archiveId).eq('included_in_training', true),
  ])

  const birthYear   = archive?.owner_birth_year   ?? null
  const birthDecade = archive?.owner_birth_decade  ?? null
  const currentYear = new Date().getFullYear()

  // Build decade range from birth decade (or 1940 default)
  const startDecade = birthDecade ?? 1940
  const DECADES: number[] = []
  for (let d = startDecade; d <= currentYear; d += 10) DECADES.push(d)

  const timeline = DECADES.map(decade => {
    const nextDecade = decade + 10

    const decadePhotos = (photos ?? []).filter(p => {
      if (p.decade) return parseInt(p.decade) === decade
      return estimateDecade(p.ai_era_estimate) === decade
    })

    const decadeDates = (dates ?? []).filter(d => d.year && d.year >= decade && d.year < nextDecade)

    const photoScore = Math.min(decadePhotos.length * 5, 50)
    const dateScore  = Math.min(decadeDates.length * 10, 30)
    const coverage   = Math.min(photoScore + dateScore, 100)

    const status =
      coverage === 0 ? 'empty'    :
      coverage < 20  ? 'sparse'   :
      coverage < 50  ? 'growing'  :
      coverage < 80  ? 'rich'     : 'complete'

    // Age at start of this decade
    const ageAtDecadeStart = birthYear ? decade - birthYear : null
    const ageAtDecadeEnd   = birthYear ? decade - birthYear + 9 : null
    const ageRange = birthYear && ageAtDecadeStart !== null
      ? `Ages ${Math.max(0, ageAtDecadeStart)}–${Math.max(0, ageAtDecadeEnd ?? ageAtDecadeStart + 9)}`
      : null

    return {
      decade,
      label:            `${decade}s`,
      coverage,
      status,
      photoCount:       decadePhotos.length,
      dateCount:        decadeDates.length,
      significantDates: decadeDates.slice(0, 3).map(d => ({ year: d.year, label: d.label ?? d.person_name, type: d.date_type })),
      previewPhotoId:   decadePhotos[0]?.id ?? null,
      locked:           coverage === 0,
      ageRange,
      ageAtDecadeStart,
    }
  }).filter(d => d.decade >= (startDecade) && (d.decade <= currentYear))

  const weakestDecade   = timeline.find(d => d.status === 'empty' || d.status === 'sparse')
  const strongestDecade = [...timeline].sort((a, b) => b.coverage - a.coverage)[0]

  return NextResponse.json({
    timeline,
    birthYear,
    totalPhotos:        photos?.length       ?? 0,
    totalDates:         dates?.length        ?? 0,
    totalDeposits:      deposits?.length     ?? 0,
    totalVoice:         voice?.length        ?? 0,
    totalTrainingPairs: trainingPairs?.length ?? 0,
    weakestDecade,
    strongestDecade,
  })
}
