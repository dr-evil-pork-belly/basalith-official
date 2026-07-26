import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_REACTIONS = new Set(['this_is_me', 'not_quite_right', 'heart'])

// Record the owner's reaction to a mirror reflection. Session verified.
export async function POST(req: NextRequest) {
  try {
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too). This is a write that
    // steers product behavior: 'not_quite_right' fires the P0 repair path in
    // lib/selectNextQuestion.ts, so a non-owner must never reach it.
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

    const { reflectionId, reaction } = await req.json()
    if (!reflectionId || !ALLOWED_REACTIONS.has(reaction)) {
      return NextResponse.json({ error: 'reflectionId and a valid reaction are required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('mirror_reflections')
      .update({ owner_reaction: reaction, reacted_at: new Date().toISOString() })
      .eq('id', reflectionId)
      .eq('archive_id', archiveId)

    if (error) throw error

    if (reaction === 'not_quite_right') {
      console.log('[mirror] correction signal — reflection:', reflectionId)
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mirror-react] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
