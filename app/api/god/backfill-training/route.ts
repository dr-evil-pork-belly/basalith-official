import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit, createTrainingPairsFromVoice } from '@/lib/trainingPipeline'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

async function countExisting(sourceId: string, sourceType: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('training_pairs')
    .select('id', { count: 'exact', head: true })
    .eq('source_id', sourceId)
    .eq('source_type', sourceType)
  return count ?? 0
}

export async function POST(req: NextRequest) {
  if (!validateGodAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body      = await req.json().catch(() => ({}))
  const archiveId = body.archiveId as string | undefined
  const batchSize = Math.min(parseInt(body.batchSize || '10'), 50)

  // Fetch archives
  let archivesQuery = supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, preferred_language')
    .eq('status', 'active')
  if (archiveId) archivesQuery = archivesQuery.eq('id', archiveId)
  const { data: archives } = await archivesQuery.limit(100)
  if (!archives?.length) return Response.json({ processed: 0, message: 'No archives found' })

  const counts = { deposits: 0, voice: 0, labels: 0, skipped: 0, errors: 0 }

  for (const archive of archives) {
    const lang    = archive.preferred_language || 'en'
    const owner   = archive.owner_name || 'Unknown'
    const name    = archive.name

    // ── 1. Deposits ───────────────────────────────────────────────────────────
    const { data: deposits } = await supabaseAdmin
      .from('owner_deposits')
      .select('id, prompt, response')
      .eq('archive_id', archive.id)
      .not('response', 'is', null)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    for (const dep of deposits ?? []) {
      try {
        const before = await countExisting(dep.id, 'deposit')
        await createTrainingPairFromDeposit(
          { id: dep.id, archive_id: archive.id, prompt: dep.prompt, response: dep.response },
          owner, name, lang,
        )
        const after = await countExisting(dep.id, 'deposit')
        if (after > before) counts.deposits++; else counts.skipped++
      } catch (e) {
        counts.errors++
        console.error('[backfill] deposit failed:', dep.id, e instanceof Error ? e.message : e)
      }
    }

    // ── 2. Voice recordings ───────────────────────────────────────────────────
    const { data: recordings } = await supabaseAdmin
      .from('voice_recordings')
      .select('id, transcript, prompt')
      .eq('archive_id', archive.id)
      .eq('transcript_status', 'complete')
      .not('transcript', 'is', null)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    for (const rec of recordings ?? []) {
      if (!rec.transcript || rec.transcript.length < 50) continue
      try {
        const before = await countExisting(rec.id, 'voice')
        await createTrainingPairsFromVoice(
          { id: rec.id, archive_id: archive.id, transcript: rec.transcript, prompt: rec.prompt ?? undefined },
          owner, name, lang,
        )
        const after = await countExisting(rec.id, 'voice')
        if (after > before) counts.voice++; else counts.skipped++
      } catch (e) {
        counts.errors++
        console.error('[backfill] voice failed:', rec.id, e instanceof Error ? e.message : e)
      }
    }

    // ── 3. Labels with substantial text ───────────────────────────────────────
    const { data: labels } = await supabaseAdmin
      .from('labels')
      .select('id, what_was_happening')
      .eq('archive_id', archive.id)
      .not('what_was_happening', 'is', null)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    for (const label of labels ?? []) {
      if (!label.what_was_happening) continue
      if (label.what_was_happening.split(/\s+/).filter(Boolean).length < 20) continue
      try {
        const before = await countExisting(label.id, 'label')
        await createTrainingPairFromDeposit(
          { id: label.id, archive_id: archive.id, prompt: 'Tell me about this photograph.', response: label.what_was_happening },
          owner, name, lang, 'label',
        )
        const after = await countExisting(label.id, 'label')
        if (after > before) counts.labels++; else counts.skipped++
      } catch (e) {
        counts.errors++
        console.error('[backfill] label failed:', label.id, e instanceof Error ? e.message : e)
      }
    }
  }

  const total = counts.deposits + counts.voice + counts.labels
  return Response.json({
    archives:  archives.length,
    ...counts,
    total,
    message: `Created ${total} pairs — ${counts.deposits} deposits, ${counts.voice} voice, ${counts.labels} labels. ${counts.skipped} skipped (already existed). ${counts.errors} errors.`,
  })
}
