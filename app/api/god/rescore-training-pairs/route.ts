import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { scoreTrainingPair } from '@/lib/trainingPipeline'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function POST(req: NextRequest) {
  if (!validateGodAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body      = await req.json().catch(() => ({}))
  const archiveId = body.archiveId as string | undefined
  const batchSize = Math.min(parseInt(body.batchSize || '20'), 50)

  // Fetch ALL pairs (not just null) — overwrite with updated scores
  let query = supabaseAdmin
    .from('training_pairs')
    .select('id, prompt, completion')
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (archiveId) query = query.eq('archive_id', archiveId)

  const { data: pairs } = await query

  if (!pairs?.length) {
    return Response.json({ rescored: 0, message: 'No pairs found' })
  }

  let rescored = 0
  let failed   = 0

  for (const pair of pairs) {
    try {
      const scores = await scoreTrainingPair(pair.prompt, pair.completion)
      await supabaseAdmin
        .from('training_pairs')
        .update({ ...scores, included_in_training: scores.quality_score >= 50 })
        .eq('id', pair.id)
      rescored++
    } catch (err: unknown) {
      console.error('[rescore-training-pairs] failed for', pair.id, err instanceof Error ? err.message : err)
      failed++
    }
  }

  const hasMore = pairs.length === batchSize

  return Response.json({
    rescored,
    failed,
    total:   pairs.length,
    message: `Rescored ${rescored} pairs.${hasMore ? ' Run again for more.' : ' All done.'}`,
  })
}
