import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_REACTIONS = new Set(['this_is_me', 'not_quite_right', 'heart'])

// Record the owner's reaction to a mirror reflection. Cookie session verified.
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const archiveId   = cookieStore.get('archive-id')?.value
    if (!archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
