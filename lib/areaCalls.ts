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

export type AreaSeed = {
  /** Matches a domain name in the scope's taxonomy exactly. */
  area:     string
  category: 'judgment' | 'conflict' | 'risk'
  question: string
}

export const AREA_SEEDS: Record<FoundingScope, AreaSeed[]> = {
  personal: [
    { area: 'Decision-Making', category: 'judgment', question: 'Tell me about a time you had to decide before you could know enough, at home or at work. What did you know, what did you not, and what did you do?' },
    { area: 'People',          category: 'judgment', question: 'Tell me about a time you had to decide whether to trust someone, and how it turned out.' },
    { area: 'Risk',            category: 'risk',     question: 'Tell me about the biggest bet you ever made with your own money or your own years. What was on the line, and what did you do?' },
    { area: 'Money',           category: 'judgment', question: 'Tell me about a time money was tight and something had to give. What was going on, and what did you choose to protect?' },
    { area: 'Standards',       category: 'conflict', question: 'Tell me about a time someone close to you crossed a line you hold. What was the line, and what did you do about it?' },
    { area: 'Direction',       category: 'judgment', question: 'Tell me about a time you turned down something most people would have taken, or took something most people would have turned down. What was it, and why?' },
    { area: 'Adversity',       category: 'risk',     question: 'Tell me about a time everything broke at once, at home or at work, and what you did in the first day.' },
    { area: 'Legacy',          category: 'judgment', question: 'Tell me about a time you handed something that mattered to someone else, and how you decided they were ready.' },
  ],
  business: [
    { area: 'Decision-Making', category: 'judgment', question: 'Tell me about a time you had to make a call for the business before the numbers could tell you anything. What did you know, and what did you do?' },
    { area: 'People',          category: 'judgment', question: 'Tell me about a hire or a firing you agonized over. What did you see, and what did you do?' },
    { area: 'Risk',            category: 'risk',     question: 'Tell me about a bet you decided not to make, one that looked good to everyone else, and why you walked away.' },
    { area: 'Capital',         category: 'judgment', question: 'Tell me about a time cash was tight and you had to choose what got funded and what did not. What was going on, and what gave?' },
    { area: 'Culture',         category: 'conflict', question: 'Tell me about a time someone senior broke a standard you had set. What did you do, and what did it cost?' },
    { area: 'Strategy',        category: 'judgment', question: 'Tell me about a time you turned away business you could have taken. What was it, and why?' },
    { area: 'Adversity',       category: 'risk',     question: 'Tell me about a time everything broke at once in the business, and what you did in the first day.' },
    { area: 'Succession',      category: 'judgment', question: 'Tell me about a time you handed a relationship or a responsibility to someone else in the business, and how you decided they were ready.' },
  ],
}

/** The taxonomy a scope's seeds must match. */
export function areasFor(scope: FoundingScope): string[] {
  return (scope === 'business' ? B2B_DOMAINS : PERSONAL_DOMAINS).map(d => d.name)
}

export function seedForArea(scope: FoundingScope, area: string): AreaSeed | null {
  return AREA_SEEDS[scope].find(s => s.area === area) ?? null
}

/** Every owner-visible string here, for the copy-rule test. */
export function allAreaCallCopy(): string[] {
  return [...AREA_SEEDS.personal, ...AREA_SEEDS.business].map(s => s.question)
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
): Promise<StartAreaCallResult> {
  const scope = scopeForTier(tier)
  const seed  = seedForArea(scope, area)
  if (!seed) return { ok: false, reason: 'unknown_area' }

  const { data: open } = await supabaseAdmin
    .from('incident_sessions')
    .select('id')
    .eq('archive_id', archiveId)
    .eq('status', 'open')
    .maybeSingle()
  if (open) return { ok: false, reason: 'already_open' }

  const session = await createIncident(archiveId, { questionId: null, category: seed.category })
  session.state.areaCall = { area: seed.area, scope, startedAt: new Date().toISOString() }
  session.state.pendingQuestion    = renderProbe({ probeType: 'SEED', anchor: '', seedText: seed.question })
  session.state.pendingProbeType   = 'SEED'
  session.state.pendingBranchIndex = -1
  await persist(session)

  return { ok: true, session, area: seed.area }
}
