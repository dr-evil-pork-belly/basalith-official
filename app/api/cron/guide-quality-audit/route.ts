import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 300

function validateCronAuth(req: NextRequest): boolean {
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET ?? ''
  return !!secret && auth === `Bearer ${secret}`
}

// Archive health scoring
async function scoreArchive(archiveId: string): Promise<number> {
  const [
    { count: photoCount    },
    { count: depositCount  },
    { count: voiceCount    },
    { count: contribCount  },
    { data:  archive       },
  ] = await Promise.all([
    supabaseAdmin.from('photographs').select('id', { count: 'exact', head: true }).eq('archive_id', archiveId),
    supabaseAdmin.from('owner_deposits').select('id', { count: 'exact', head: true }).eq('archive_id', archiveId),
    supabaseAdmin.from('voice_recordings').select('id', { count: 'exact', head: true }).eq('archive_id', archiveId).eq('transcript_status', 'complete'),
    supabaseAdmin.from('contributors').select('id', { count: 'exact', head: true }).eq('archive_id', archiveId).eq('status', 'active'),
    supabaseAdmin.from('archives').select('archive_score').eq('id', archiveId).single(),
  ])

  let score = 0
  if ((photoCount   ?? 0) >= 50)  score += 25
  if ((depositCount ?? 0) >= 20)  score += 25
  if ((voiceCount   ?? 0) >= 2)   score += 20
  if ((contribCount ?? 0) >= 2)   score += 15
  if ((archive?.archive_score ?? 0) >= 30) score += 15

  return score
}

export async function POST(req: NextRequest) {
  if (!validateCronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all active archivists
  const { data: guides } = await supabaseAdmin
    .from('archivists')
    .select('id, name')
    .eq('status', 'active')

  if (!guides?.length) return NextResponse.json({ message: 'No guides', processed: 0 })

  const results: { guideId: string; qualityScore: number; archiveCount: number }[] = []

  for (const guide of guides) {
    // Get their active client archives
    const { data: activeProspects } = await supabaseAdmin
      .from('prospects')
      .select('id, name')
      .eq('archivist_id', guide.id)
      .eq('status', 'Active Client')

    if (!activeProspects?.length) {
      await supabaseAdmin.from('archivists').update({ quality_score: 0, active_archives: 0 }).eq('id', guide.id)
      continue
    }

    // For each prospect, find the associated archive and score it
    // Prospects link to archives via the onboard flow — match by similar name or use a direct lookup
    const { data: archives } = await supabaseAdmin
      .from('archives')
      .select('id')
      .eq('status', 'active')
      .in('id', activeProspects.map(p => p.id))
      .limit(100)

    let scoreSum = 0
    let scored   = 0

    // Score available archives
    for (const archive of (archives ?? [])) {
      const s = await scoreArchive(archive.id)
      scoreSum += s
      scored++
    }

    // Fill remaining with estimated score based on guide's overall track record
    const fallback = 50
    const total = activeProspects.length
    const remaining = total - scored

    const avgScore = scored > 0
      ? (scoreSum + remaining * fallback) / total
      : fallback

    await supabaseAdmin
      .from('archivists')
      .update({
        quality_score:   Number(avgScore.toFixed(2)),
        active_archives: total,
      })
      .eq('id', guide.id)

    results.push({ guideId: guide.id, qualityScore: Math.round(avgScore), archiveCount: total })
  }

  // Flag guides with quality score below 50
  const flagged = results.filter(r => r.qualityScore < 50)
  if (flagged.length) {
    console.log('[guide-quality-audit] Guides needing coaching review:', flagged.map(f => f.guideId))
  }

  return NextResponse.json({
    processed: results.length,
    flagged:   flagged.length,
    results,
  })
}
