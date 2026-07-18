import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

// Latest mirror reflection for an archive (mobile). archiveId via query param.
export async function GET(req: NextRequest) {
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

    const { data } = await supabaseAdmin
      .from('mirror_reflections')
      .select('id, reflection, thread_question, owner_reaction, created_at')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ mirror: data ?? null })
  } catch (error: unknown) {
    console.error('[mobile-mirror] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ mirror: null })
  }
}
