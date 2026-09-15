import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { loadOwnerCoverage } from '@/lib/coverageOwner'

export const dynamic = 'force-dynamic'

// The owner's coverage map. Read-only: it returns what the last coverage run
// wrote for this archive, labeled server side. It never computes coverage on
// render (a run is roughly a hundred model calls) and never returns an
// off-label run. archiveId is resolved from the session, never the client.
export async function GET() {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const coverage = await loadOwnerCoverage(archive.id, archive.tier)
    return NextResponse.json(coverage)
  } catch (err) {
    console.error('[archive/coverage]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not load the coverage map' }, { status: 500 })
  }
}
