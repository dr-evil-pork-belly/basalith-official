import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const archivistId = req.nextUrl.searchParams.get('id')

  if (!archivistId) {
    return NextResponse.json({ error: 'archivistId required' }, { status: 400 })
  }

  const [
    { data: archivist,    error: archivistErr    },
    { data: prospects,    error: prospectsErr    },
    { data: commissions,  error: commissionsErr  },
    { data: leaderboard,  error: leaderboardErr  },
  ] = await Promise.all([
    supabaseAdmin
      .from('archivists')
      .select('*')
      .eq('id', archivistId)
      .single(),

    supabaseAdmin
      .from('prospects')
      .select('id, name, status, tier, next_action, last_contact, updated_at')
      .eq('archivist_id', archivistId)
      .order('updated_at', { ascending: false }),

    supabaseAdmin
      .from('commissions')
      .select('*')
      .eq('archivist_id', archivistId)
      .order('created_at', { ascending: false })
      .limit(20),

    supabaseAdmin
      .from('archivist_leaderboard')
      .select('id, name, rank, total_closings, this_month_closings, top_tier, residual_income_cents')
      .limit(10),
  ])

  if (archivistErr || !archivist) {
    return NextResponse.json({ error: 'Archivist not found' }, { status: 404 })
  }

  const pipelineCounts: Record<string, number> = {}
  for (const p of (prospects ?? [])) {
    pipelineCounts[p.status] = (pipelineCounts[p.status] ?? 0) + 1
  }

  const todaysActions = (prospects ?? [])
    .filter(p => p.next_action && p.status !== 'Closed' && p.status !== 'Lost')
    .slice(0, 5)

  return NextResponse.json({
    archivist,
    pipelineCounts,
    todaysActions,
    commissions:    commissions    ?? [],
    leaderboard:    leaderboard    ?? [],
    leaderboardError: leaderboardErr?.message ?? null,
  })
}
