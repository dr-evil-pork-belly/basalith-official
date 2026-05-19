import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const DIMENSION_LABELS: Record<string, string> = {
  early_life:               'Early Life',
  professional_philosophy:  'Work & Purpose',
  core_values:              'Values & Beliefs',
  relationship_to_family:   'Family',
  approach_to_people:       'People',
  wisdom_and_lessons:       'Wisdom',
  defining_experiences:     'Key Experiences',
  fears_and_vulnerabilities:'Inner Life',
  approach_to_money:        'Money & Wealth',
}

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const [accuracyRes, depositsRes] = await Promise.allSettled([
    supabaseAdmin
      .from('entity_accuracy')
      .select('dimension, accuracy_score')
      .eq('archive_id', archiveId),
    supabaseAdmin
      .from('owner_deposits')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),
  ])

  const accuracyRows = accuracyRes.status === 'fulfilled' ? (accuracyRes.value.data ?? []) : []
  const totalDeposits = depositsRes.status === 'fulfilled' ? (depositsRes.value.count ?? 0) : 0

  const dimensions = accuracyRows.map((r: any) => ({
    id:    r.dimension,
    label: DIMENSION_LABELS[r.dimension] ?? r.dimension,
    score: Math.round((r.accuracy_score ?? 0) * 100),
  })).sort((a, b) => b.score - a.score)

  const overallScore = dimensions.length > 0
    ? Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)
    : 0

  const depthLabel =
    overallScore >= 80 ? 'Deep' :
    overallScore >= 60 ? 'Developing' :
    overallScore >= 30 ? 'Early' :
    'Just starting'

  return NextResponse.json({ overallScore, depthLabel, dimensions, totalDeposits })
}
