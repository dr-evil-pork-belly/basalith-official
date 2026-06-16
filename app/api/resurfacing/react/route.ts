import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const ALLOWED_REACTIONS = new Set(['remember', 'heart'])

// Single tap on today's resurfacing card. Stored signal only — no downstream
// logic. Sets reaction + reacted_at on today's row for the signed-in archive.
export async function POST(req: NextRequest) {
  try {
    const session   = await getSessionUser()
    const archiveId = session?.archiveId
    if (!archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reaction } = await req.json()
    if (!ALLOWED_REACTIONS.has(reaction)) {
      return NextResponse.json({ error: 'a valid reaction is required' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10) // UTC day
    const { error } = await supabaseAdmin
      .from('deposit_resurfacings')
      .update({ reaction, reacted_at: new Date().toISOString() })
      .eq('archive_id', archiveId)
      .eq('shown_on', today)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[resurfacing/react] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
