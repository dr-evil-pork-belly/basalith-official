import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getArchivistSession } from '@/lib/apiSecurity'

export async function GET(req: NextRequest) {
  // ── Verify the session cookie matches the requested archivistId (IDOR guard)
  const session = await getArchivistSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const archivistId = req.nextUrl.searchParams.get('id')
  if (!archivistId) return NextResponse.json({ error: 'archivistId required' }, { status: 400 })

  if (archivistId !== session.archivistId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    { data: archivist,   error: archivistErr },
    { data: prospects                        },
    { data: commissions                      },
    { data: cert                             },
    { data: leaderboard                      },
  ] = await Promise.all([
    supabaseAdmin.from('archivists').select('*').eq('id', archivistId).single(),
    supabaseAdmin.from('prospects').select('id, name, status, tier, next_action, last_contact, updated_at, closed_at, created_at').eq('archivist_id', archivistId).order('updated_at', { ascending: false }),
    supabaseAdmin.from('commissions').select('*').eq('archivist_id', archivistId).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('guide_certifications').select('*').eq('archivist_id', archivistId).maybeSingle(),
    supabaseAdmin.from('archivists').select('id, name, rank, total_closings, this_month_closings, residual_income_cents').order('total_closings', { ascending: false }).limit(10),
  ])

  if (archivistErr || !archivist) return NextResponse.json({ error: 'Archivist not found' }, { status: 404 })

  // Pipeline breakdown
  const pipelineCounts: Record<string, number> = {}
  for (const p of (prospects ?? [])) {
    pipelineCounts[p.status] = (pipelineCounts[p.status] ?? 0) + 1
  }

  // Earnings this month
  const now     = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthCommissions = (commissions ?? []).filter(c => c.created_at >= monthStart)
  const thisMonthEarnings    = thisMonthCommissions.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)

  // Active clients count
  const activeCount = pipelineCounts['Active Client'] ?? 0

  // Residual MRR
  const RESIDUAL_MONTHLY: Record<string, number> = { archive: 1200, estate: 2400, dynasty: 6400 } // cents
  const activeProspects    = (prospects ?? []).filter(p => p.status === 'Active Client')
  const residualMRRCents   = activeProspects.reduce((sum, p) => {
    const tier = (p.tier ?? '').toLowerCase()
    return sum + (RESIDUAL_MONTHLY[tier] ?? 2400)
  }, 0)

  // Quality score from archivist table
  const qualityScore = Number(archivist.quality_score ?? 0)

  return NextResponse.json({
    archivist,
    pipelineCounts,
    prospects:       prospects ?? [],
    commissions:     commissions ?? [],
    leaderboard:     leaderboard ?? [],
    certification:   cert,
    metrics: {
      activeClients:    activeCount,
      thisMonthCents:   thisMonthEarnings,
      residualMRRCents,
      qualityScore,
    },
  })
}
