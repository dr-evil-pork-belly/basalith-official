import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import {
  loadOpenIncident,
  createIncident,
  persist,
  pickIncidentSeed,
  type IncidentSession,
} from '@/lib/incidentSession'
import { renderProbe } from '@/lib/renderProbe'

export const dynamic = 'force-dynamic'

// Serves the founder's current incident-interview probe (succession / founder_web
// only). archiveId is resolved from the session, never the client. This route is
// reload-safe: it NEVER advances. If an incident is open it returns that
// incident's pending probe verbatim; only POST /answer advances. If no incident
// is open it opens one from a narrative incident seed and returns the SEED probe.
export async function GET() {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier')
    .eq('id', archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId || archive.tier !== 'succession') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serve = (s: IncidentSession) =>
    NextResponse.json({
      // Existing client contract: questionText is shown, b2bQuestionId is
      // round-tripped. We keep both and add incident fields the client can ignore.
      b2bQuestionId: s.id,
      questionText:  s.state.pendingQuestion ?? null,
      domainId:      null,
      incidentId:    s.id,
      probeType:     s.state.pendingProbeType ?? null,
      phase:         s.phase,
    })

  // 1. Reuse an open incident's pending probe. Reloading never advances.
  const open = await loadOpenIncident(archiveId)
  if (open) return serve(open)

  // 2. No open incident: pick a narrative incident seed and open one.
  const seed = await pickIncidentSeed(archiveId)
  if (!seed) {
    return NextResponse.json({ b2bQuestionId: null, questionText: null, domainId: null, allAnswered: true })
  }

  let incident: IncidentSession
  try {
    incident = await createIncident(archiveId, { questionId: seed.questionId, category: seed.category })
  } catch (err) {
    // The partial unique index allows one open incident per archive. If a
    // concurrent request just opened one, reuse the winner instead of erroring.
    const raced = await loadOpenIncident(archiveId)
    if (raced) return serve(raced)
    console.error('[b2b-question/next] could not open incident:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start incident' }, { status: 500 })
  }

  const seedProbe = renderProbe({ probeType: 'SEED', anchor: '', seedText: seed.seedText })
  incident.state.pendingQuestion    = seedProbe
  incident.state.pendingProbeType   = 'SEED'
  incident.state.pendingBranchIndex = -1
  await persist(incident)

  return serve(incident)
}
