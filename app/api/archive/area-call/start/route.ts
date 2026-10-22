import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { startAreaCall } from '@/lib/areaCalls'
import { getFoundingStatus } from '@/lib/foundingSequence'
import { loadLens } from '@/lib/questionLensStore'

export const dynamic = 'force-dynamic'

// Opens one area call: an incident interview aimed at one thin area of the
// coverage map. Owner only; archiveId from the session, never the client. The
// area must be in the archive's own taxonomy (personal or business by tier).
// If any interview is already open, that one is returned instead of an error,
// so the page can continue it. /api/archive/b2b-question/answer advances it.
export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`area-call-start:${ip}`, 30, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, status')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const area = typeof body?.area === 'string' ? body.area.trim().slice(0, 40) : ''
  if (!area) return NextResponse.json({ error: 'Area is required' }, { status: 400 })

  try {
    // Who is being asked picks the opener: an assessment gets the acquisition
    // openers, a church record the church ones (lib/questionLens.ts).
    const lens = await loadLens(archive)
    const result = await startAreaCall(archive.id, archive.tier, area, lens)
    if (!result.ok && result.reason === 'unknown_area') {
      return NextResponse.json({ error: 'That area is not on your map' }, { status: 400 })
    }
    // Opened, or already open: either way the page continues from status.
    const status = await getFoundingStatus(archive.id, archive.tier)
    return NextResponse.json({
      ok:      true,
      opened:  result.ok,
      area:    result.ok ? result.area : status.current?.area ?? null,
      current: status.current,
    })
  } catch (err) {
    console.error('[area-call/start]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not open the call' }, { status: 500 })
  }
}
