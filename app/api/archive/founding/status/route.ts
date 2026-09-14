import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { getFoundingStatus } from '@/lib/foundingSequence'

export const dynamic = 'force-dynamic'

// Read-only. Returns the Founding Sequence status for the caller's own archive:
// which of the three calls are done, which is open, and the pending probe if
// one is out. Never opens or advances an incident; POST /founding/start opens
// and POST /b2b-question/answer advances. archiveId is resolved from the
// session, never the client. Any owner tier is allowed; the tier only picks the
// seed set.
export async function GET() {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, owner_name')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const status = await getFoundingStatus(archive.id, archive.tier)
    return NextResponse.json({ ...status, ownerName: archive.owner_name ?? null })
  } catch (err) {
    console.error('[founding/status]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not load the Founding Sequence' }, { status: 500 })
  }
}
