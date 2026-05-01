import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const DIMENSION_LABELS: Record<string, string> = {
  early_life:               'Early Life',
  relationship_to_family:   'Family',
  professional_philosophy:  'Work',
  core_values:              'Values',
  approach_to_people:       'People',
  defining_experiences:     'Key Moments',
  wisdom_and_lessons:       'Wisdom',
  approach_to_money:        'Money',
  spiritual_beliefs:        'Beliefs',
  fears_and_vulnerabilities: 'Vulnerabilities',
}

const DIMENSIONS = Object.keys(DIMENSION_LABELS)

function coverageStatus(pct: number) {
  if (pct === 0)   return 'empty'
  if (pct < 25)    return 'sparse'
  if (pct < 60)    return 'growing'
  if (pct < 90)    return 'rich'
  return 'complete'
}

export async function GET() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value

  if (!archiveId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [photosResult, accuracyResult] = await Promise.all([
    supabaseAdmin
      .from('photographs')
      .select('ai_era_estimate, status')
      .eq('archive_id', archiveId)
      .not('ai_era_estimate', 'is', null),

    supabaseAdmin
      .from('entity_accuracy')
      .select('dimension, accuracy_score')
      .eq('archive_id', archiveId),
  ])

  const photos   = photosResult.data   ?? []
  const accuracy = accuracyResult.data ?? []

  // Decade coverage — 1940s to current decade
  const currentDecade = Math.floor(new Date().getFullYear() / 10) * 10
  const decadeCoverage = []

  for (let decade = 1940; decade <= currentDecade; decade += 10) {
    const decadeStr = `${decade}s`
    const count     = photos.filter(p =>
      p.ai_era_estimate?.includes(decadeStr) ||
      p.ai_era_estimate?.includes(String(decade))
    ).length

    const coverage = Math.min(Math.round(count / 10 * 100), 100)
    decadeCoverage.push({
      decade,
      label:      decadeStr,
      photoCount: count,
      coverage,
      status:     coverageStatus(coverage),
    })
  }

  // Dimension coverage
  const dimensionCoverage = DIMENSIONS.map(dim => {
    const row   = accuracy.find(a => a.dimension === dim)
    const score = Math.round((row?.accuracy_score ?? 0) * 100) / 100
    return {
      dimension: dim,
      label:     DIMENSION_LABELS[dim],
      score:     Math.round(score),
      status:    coverageStatus(score),
    }
  }).sort((a, b) => a.score - b.score)

  const weakestDecade     = decadeCoverage.find(d => d.status === 'empty' || d.status === 'sparse') ?? null
  const weakestDimension  = dimensionCoverage[0] ?? null

  return Response.json({
    decadeCoverage,
    dimensionCoverage,
    totalPhotos:       photos.length,
    weakestDecade,
    weakestDimension,
  })
}
