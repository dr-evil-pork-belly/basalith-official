import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import {
  DIMENSIONS,
  calculateDimensionScore,
  getEntityDepthLabel,
  getTopImprovements,
} from '@/lib/entityAccuracy'

export async function GET() {
  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too). This GET also upserts
  // entity_accuracy, so it is a write as well as a read.
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [deposits, conversations, labels] = await Promise.all([
    supabaseAdmin.from('owner_deposits').select('response, prompt').eq('archive_id', archiveId),
    supabaseAdmin.from('entity_conversations').select('role, content, accuracy_rating').eq('archive_id', archiveId),
    supabaseAdmin.from('labels').select('what_was_happening, legacy_note').eq('archive_id', archiveId),
  ])

  const depositsData      = deposits.data      || []
  const conversationsData = conversations.data || []
  const labelsData        = labels.data        || []

  const dimensionScores = DIMENSIONS.map(dim => ({
    dimension: dim,
    score:     calculateDimensionScore(dim, depositsData, conversationsData, labelsData),
  }))

  const overallScore = Math.round(
    dimensionScores.reduce((sum, d) => sum + d.score, 0) / DIMENSIONS.length
  )

  const depthLabel   = getEntityDepthLabel(overallScore)
  const improvements = getTopImprovements(dimensionScores)

  // Persist to entity_accuracy table (non-blocking, requires unique constraint)
  Promise.all(
    dimensionScores.map(ds =>
      supabaseAdmin.from('entity_accuracy').upsert(
        {
          archive_id:     archiveId,
          dimension:      ds.dimension.id,
          accuracy_score: ds.score / 100,
          last_updated:   new Date().toISOString(),
        },
        { onConflict: 'archive_id,dimension' }
      )
    )
  ).catch(err => console.warn('entity_accuracy upsert skipped:', err.message))

  return NextResponse.json({
    overallScore,
    depthLabel,
    dimensions: dimensionScores.map(ds => ({
      id:          ds.dimension.id,
      label:       ds.dimension.label,
      description: ds.dimension.description,
      score:       ds.score,
    })),
    improvements,
    totalDeposits:       depositsData.length,
    totalConversations:  conversationsData.length,
    totalLabels:         labelsData.length,
  })
}
