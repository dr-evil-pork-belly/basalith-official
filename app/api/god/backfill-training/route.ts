import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function POST(req: NextRequest) {
  if (!validateGodAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body       = await req.json().catch(() => ({}))
  const archiveId  = body.archiveId as string | undefined
  const batchSize  = Math.min(parseInt(body.batchSize || '10'), 50)

  // Fetch archives
  let archivesQuery = supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, preferred_language')
    .eq('status', 'active')

  if (archiveId) archivesQuery = archivesQuery.eq('id', archiveId)

  const { data: archives } = await archivesQuery.limit(100)
  if (!archives?.length) return Response.json({ processed: 0, message: 'No archives found' })

  let processed   = 0
  let created     = 0
  let skipped     = 0
  let errors      = 0

  for (const archive of archives) {
    // Fetch deposits not yet in training_pairs
    const { data: deposits } = await supabaseAdmin
      .from('owner_deposits')
      .select('id, prompt, response')
      .eq('archive_id', archive.id)
      .not('response', 'is', null)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    for (const deposit of deposits ?? []) {
      try {
        // Count pairs before insert to detect idempotency skip
        const { count: beforeCount } = await supabaseAdmin
          .from('training_pairs')
          .select('id', { count: 'exact', head: true })
          .eq('source_id', deposit.id)
          .eq('source_type', 'deposit')

        await createTrainingPairFromDeposit(
          { id: deposit.id, archive_id: archive.id, prompt: deposit.prompt, response: deposit.response },
          archive.owner_name || 'Unknown',
          archive.name,
          archive.preferred_language || 'en',
        )

        const { count: afterCount } = await supabaseAdmin
          .from('training_pairs')
          .select('id', { count: 'exact', head: true })
          .eq('source_id', deposit.id)
          .eq('source_type', 'deposit')

        if ((afterCount ?? 0) > (beforeCount ?? 0)) {
          created++
        } else {
          skipped++
        }
        processed++
      } catch (err) {
        errors++
        console.error('[backfill-training] pair creation failed:', deposit.id, err instanceof Error ? err.message : err)
      }
    }
  }

  return Response.json({
    archives:  archives.length,
    processed,
    created,
    skipped,
    errors,
    message: `Processed ${processed} deposits across ${archives.length} archives. ${created} new pairs created.`,
  })
}
