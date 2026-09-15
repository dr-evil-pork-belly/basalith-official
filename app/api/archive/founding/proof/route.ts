import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP, sanitizedError } from '@/lib/apiSecurity'
import { getFoundingStatus } from '@/lib/foundingSequence'
import { buildFoundingProof } from '@/lib/foundingProof'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ONE_HOUR_MS = 60 * 60 * 1000

// The founding proof: one question the owner's archive answers from a deposit
// (deposit shown), one it declines. Owner-only, available once the three
// founding calls are complete, computed on demand and never stored. Up to
// eight model calls per run, so it is rate limited per IP. Writes nothing and
// logs nothing to grounding_gaps; see lib/foundingProof.ts.
export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`founding-proof:${ip}`, 4, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Your archive is resting. Try again in a little while.' }, { status: 429 })
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
    const status = await getFoundingStatus(archive.id, archive.tier)
    if (!status.done) {
      return NextResponse.json({ error: 'Finish the three calls first.' }, { status: 409 })
    }
    const proof = await buildFoundingProof(archive.id, status.scope)
    return NextResponse.json(proof)
  } catch (err) {
    return NextResponse.json({ error: sanitizedError(err, 'founding-proof') }, { status: 500 })
  }
}
