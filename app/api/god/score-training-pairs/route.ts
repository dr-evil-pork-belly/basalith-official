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
  const limit     = Math.min(parseInt(body.limit || '50'), 100)

  let query = supabaseAdmin
    .from('training_pairs')
    .select('id, prompt, completion')
    .is('quality_score', null)
    .limit(limit)

  if (archiveId) query = query.eq('archive_id', archiveId)

  const { data: unscored } = await query

  if (!unscored?.length) {
    return Response.json({ scored: 0, message: 'No unscored pairs found' })
  }

  let scored = 0
  let failed = 0

  for (const pair of unscored) {
    try {
      const scores = await scoreTrainingPair(pair.prompt, pair.completion)
      await supabaseAdmin
        .from('training_pairs')
        .update({ ...scores, included_in_training: scores.quality_score >= 60 })
        .eq('id', pair.id)
      scored++
    } catch (err: unknown) {
      console.error('[score-training-pairs] failed for', pair.id, err instanceof Error ? err.message : err)
      failed++
    }
  }

  return Response.json({
    scored,
    failed,
    total:   unscored.length,
    message: `Scored ${scored} pairs.${unscored.length === limit ? ' Run again for more.' : ' All done.'}`,
  })
}
