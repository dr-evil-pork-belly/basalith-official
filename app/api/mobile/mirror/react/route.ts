import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

const ALLOWED_REACTIONS = new Set(['this_is_me', 'not_quite_right', 'heart'])

// Record the owner's reaction to a mirror reflection (mobile). The update is
// scoped by archive_id so a reaction can only touch that archive's reflection.
export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'reflectionId and a valid reaction are required' },
        { status: 400 },
      )
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
    console.error('[mobile-mirror-react] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
