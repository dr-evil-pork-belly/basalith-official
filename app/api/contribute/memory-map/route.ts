import { NextRequest } from 'next/server'
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

function coverageStatus(pct: number) {
  if (pct === 0)   return 'empty'
  if (pct < 25)    return 'sparse'
  if (pct < 60)    return 'growing'
  if (pct < 90)    return 'rich'
  return 'complete'
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })

  const { data: contributor } = await supabaseAdmin
    .from('contributors')
    .select('archive_id')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!contributor) return Response.json({ error: 'Not found' }, { status: 404 })

  const archiveId = contributor.archive_id

  const [photosResult, accuracyResult] = await Promise.all([
    supabaseAdmin
      .from('photographs')
      .select('ai_era_estimate')
      .eq('archive_id', archiveId)
      .not('ai_era_estimate', 'is', null),

    supabaseAdmin
      .from('entity_accuracy')
      .select('dimension, accuracy_score')
      .eq('archive_id', archiveId),
  ])

  const photos   = photosResult.data   ?? []
  const accuracy = accuracyResult.data ?? []

  const currentDecade = Math.floor(new Date().getFullYear() / 10) * 10
  const decadeCoverage = []

  for (let decade = 1940; decade <= currentDecade; decade += 10) {
    const decadeStr = `${decade}s`
    const count     = photos.filter(p =>
      p.ai_era_estimate?.includes(decadeStr) ||
      p.ai_era_estimate?.includes(String(decade))
    ).length
    const coverage  = Math.min(Math.round(count / 10 * 100), 100)
    decadeCoverage.push({ decade, label: decadeStr, photoCount: count, coverage, status: coverageStatus(coverage) })
  }

  const dimensionCoverage = Object.keys(DIMENSION_LABELS).map(dim => {
    const row   = accuracy.find(a => a.dimension === dim)
    const score = Math.round((row?.accuracy_score ?? 0) * 100) / 100
    return { dimension: dim, label: DIMENSION_LABELS[dim], score: Math.round(score), status: coverageStatus(score) }
  }).sort((a, b) => a.score - b.score)

  return Response.json({
    decadeCoverage,
    dimensionCoverage,
    weakestDecade:     decadeCoverage.find(d => d.status === 'empty' || d.status === 'sparse') ?? null,
    weakestDimension:  dimensionCoverage[0] ?? null,
  })
}
