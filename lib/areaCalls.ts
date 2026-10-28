/**
 * Area calls: one incident interview aimed at one thin area of the coverage map.
 *
 * The map tells an owner where the archive is silent. Until September 17, 2026
 * it gave them nowhere to go: the Founding Sequence is three calls and then
 * closes, and the open capture surfaces on the dashboard are not aimed at
 * anything. The growth recon's standing rule was that the map should govern
 * question selection before any capture surface adds volume. This is that.
 *
 * Nothing here is a new engine. An area call is the same incident interview
 * the founding calls run (lib/incidentSession.ts), opened with a seed written
 * for the area, marked in `incident_sessions.state.areaCall`, advanced by
 * /api/archive/b2b-question/answer, and surfaced on /archive/founding. When it
 * closes, /answer requests a fresh coverage reading so the map moves on the
 * deposits that were just made.
 *
 * SEEDS. Same form as the founding openers: a real moment, not a value
 * statement, because the verifier can ground a position in what someone did
 * and cannot ground one in what they believe. A seed and a coverage probe aim
 * at the same kind of judgment on purpose; a probe measures, a seed elicits.
 * No seed repeats a probe word for word (test pins it), and the interview that
 * follows a seed runs ten to twenty turns past it, so a call is never one
 * answer to one probe.
 *
 * Seeds are rendered to the owner, so they are copy: no em dashes, no
 * exclamation points, American English.
 */

import { supabaseAdmin } from './supabase-admin'
import { createIncident, persist, type IncidentSession, type IncidentState } from './incidentSession'
import { renderProbe } from './renderProbe'
import { PERSONAL_DOMAINS } from './personalDomains'
import { B2B_DOMAINS } from './b2bDomains'
import { scopeForTier, type FoundingScope } from './foundingSequence'
import { AREA_SEEDS, LENS_AREA_SEEDS, seedForArea, type AreaSeed } from './areaSeeds'
import { lensFor, type QuestionLens } from './questionLens'
import type { OpenerResult } from './ownerOpener'

// The seeds live in lib/areaSeeds.ts since September 24, 2026; re-exported so
// every existing import from this module keeps working.
export { AREA_SEEDS, LENS_AREA_SEEDS, seedForArea, type AreaSeed }

/** The taxonomy a scope's seeds must match. */
export function areasFor(scope: FoundingScope): string[] {
  return (scope === 'business' ? B2B_DOMAINS : PERSONAL_DOMAINS).map(d => d.name)
}


/** Every owner-visible string here, for the copy-rule test. */
export function allAreaCallCopy(): string[] {
  return [
    ...AREA_SEEDS.personal,
    ...AREA_SEEDS.business,
    ...LENS_AREA_SEEDS.acquisition,
    ...LENS_AREA_SEEDS.church,
  ].map(s => s.question)
}

// Cheap import-time check, same idea as the probe sets: a seed naming an area
// that is not in its taxonomy would open a call the map could never credit.
function assertSeedShape(): void {
  for (const scope of ['personal', 'business'] as FoundingScope[]) {
    const areas = new Set(areasFor(scope))
    const seen  = new Set<string>()
    for (const s of AREA_SEEDS[scope]) {
      if (!areas.has(s.area)) throw new Error(`[areaCalls] ${scope} seed names an area not in its taxonomy: ${s.area}`)
      if (seen.has(s.area)) throw new Error(`[areaCalls] ${scope} has two seeds for ${s.area}`)
      seen.add(s.area)
    }
    if (seen.size !== areas.size) throw new Error(`[areaCalls] ${scope} seeds cover ${seen.size} of ${areas.size} areas`)
  }
  // The lens openers ride a scope's taxonomy and must cover it exactly, in
  // order, or a lens call would open on an area the map cannot credit.
  const lensScopes: [keyof typeof LENS_AREA_SEEDS, FoundingScope][] = [['acquisition', 'business'], ['church', 'personal']]
  for (const [lens, scope] of lensScopes) {
    const want = areasFor(scope).join('|')
    const have = LENS_AREA_SEEDS[lens].map(s => s.area).join('|')
    if (want !== have) throw new Error(`[areaCalls] ${lens} openers do not match the ${scope} taxonomy`)
  }
}
assertSeedShape()

// ── Persistence ───────────────────────────────────────────────────────────────

/** The area of the incident open on this archive, if it is an area call. */
export async function openAreaCall(archiveId: string): Promise<{ incidentId: string; area: string } | null> {
  const { data } = await supabaseAdmin
    .from('incident_sessions')
    .select('id, state')
    .eq('archive_id', archiveId)
    .eq('status', 'open')
    .maybeSingle()
  const marker = (data?.state as IncidentState | undefined)?.areaCall
  if (!data || !marker) return null
  return { incidentId: data.id as string, area: marker.area }
}

export type StartAreaCallResult =
  | { ok: true; session: IncidentSession; area: string }
  | { ok: false; reason: 'unknown_area' | 'already_open' }

/**
 * Open one area call. Refuses when any incident is already open on the archive
 * (one open incident per archive, partial unique index; the caller continues
 * that one) or when the area is not in the scope's taxonomy. Sets the SEED
 * probe as pending exactly as startFoundingCall does, so /answer takes it from
 * here.
 */
export async function startAreaCall(
  archiveId: string,
  tier: string | null | undefined,
  area: string,
  /** Who is being asked (lib/questionLens.ts). Omitted: derived from the tier alone. */
  lens: QuestionLens = lensFor({ tier }),
  /**
   * Writes the opener from the owner's own description of his business
   * (lib/ownerOpener.ts, October 28, 2026). Called after the open call check
   * and before the call row is created. Omitted, or returning the authored
   * opener, changes nothing.
   */
  writeOpener?: (seed: AreaSeed) => Promise<OpenerResult>,
): Promise<StartAreaCallResult> {
  const scope = scopeForTier(tier)
  const seed  = seedForArea(scope, area, lens)
  if (!seed) return { ok: false, reason: 'unknown_area' }

  const { data: open } = await supabaseAdmin
    .from('incident_sessions')
    .select('id')
    .eq('archive_id', archiveId)
    .eq('status', 'open')
    .maybeSingle()
  if (open) return { ok: false, reason: 'already_open' }

  // The opener is written BEFORE the call row exists (October 28, 2026 review).
  // Writing it after createIncident left an open row with no question for as
  // long as the model calls took; a function killed in that gap left the
  // owner locked out of every call. Now the row is created and persisted
  // back to back, with its question already in hand.
  let pendingQuestion = renderProbe({ probeType: 'SEED', anchor: '', seedText: seed.question })
  let opener: OpenerResult | null = null
  if (writeOpener) {
    // Fails closed inside: a model error serves the authored opener. A throw
    // is caught here too, and the authored opener goes out.
    try {
      opener = await writeOpener(seed)
      if (opener.source === 'interviewer') {
        pendingQuestion = renderProbe({ probeType: 'SEED', anchor: '', seedText: opener.text })
      }
    } catch (err) {
      console.error('[areaCalls] opener writer threw, authored opener served:', err instanceof Error ? err.message : err)
      opener = null
    }

    // The wait may have been long. If another tab opened a call meanwhile,
    // that call wins and this opener is dropped.
    const { data: openNow } = await supabaseAdmin
      .from('incident_sessions')
      .select('id')
      .eq('archive_id', archiveId)
      .eq('status', 'open')
      .maybeSingle()
    if (openNow) return { ok: false, reason: 'already_open' }
  }

  const session = await createIncident(archiveId, { questionId: null, category: seed.category })
  session.state.areaCall = { area: seed.area, scope, startedAt: new Date().toISOString() }
  session.state.lens     = lens
  session.state.pendingQuestion = pendingQuestion
  if (opener) {
    session.state.opener = opener.log
    if (opener.source === 'interviewer') session.state.pendingQuestionSource = 'interviewer'
  }
  session.state.pendingProbeType   = 'SEED'
  session.state.pendingBranchIndex = -1
  await persist(session)

  return { ok: true, session, area: seed.area }
}
