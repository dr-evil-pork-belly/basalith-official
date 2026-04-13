import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/game/active?archiveId=xxx
// Returns the current active game session for an archive (for the portal dashboard)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const archiveId = searchParams.get('archiveId')

    if (!archiveId) {
      return NextResponse.json({ error: 'Missing archiveId' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const { data: session } = await supabaseAdmin
      .from('memory_game_sessions')
      .select('id, closes_at, total_memories, photograph_ids, created_at')
      .eq('archive_id', archiveId)
      .eq('status', 'active')
      .gt('closes_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ session: null })
    }

    // Get leaderboard
    const { data: contributions } = await supabaseAdmin
      .from('memory_game_contributions')
      .select('contributor_name, contributor_email')
      .eq('session_id', session.id)

    const countMap: Record<string, number> = {}
    for (const c of contributions ?? []) {
      const key = c.contributor_name || c.contributor_email
      countMap[key] = (countMap[key] || 0) + 1
    }
    const leaderboard = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      session: {
        id:            session.id,
        closesAt:      session.closes_at,
        totalMemories: session.total_memories,
        photoCount:    (session.photograph_ids ?? []).length,
      },
      leaderboard,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
