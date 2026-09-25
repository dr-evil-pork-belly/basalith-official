/**
 * The question planner: which area of the coverage map the next question aims at.
 *
 * Tailored questions, slice 2 (docs/TAILORED_QUESTIONS_2026-09-24.md, section 4;
 * runbook docs/TAILORED_QUESTIONS_SLICE_2_2026-09-24.md). Until this slice the
 * daily question aimed at deposit density (lib/selectNextQuestion.ts) and the
 * succession opener rotated in bank order (pickIncidentSeed in
 * lib/incidentSession.ts). Neither read the coverage map, which is the one
 * instrument that knows where a successor or a family would be guessing.
 *
 * Pure functions plus one loader. No model call decides what to aim at.
 *
 * RANKING. An area's need is its coverage state (open above partial above
 * backed) plus its overreach (where the entity reaches past the record most is
 * where one deposit changes the most). The area asked last is never asked
 * again next, unless it is the only one. The caller decides whether to keep the
 * 80/20 explore split (the daily B2C email does) or to stay deterministic (the
 * succession opener does, so the email and the portal show the same opener).
 *
 * B2C BANK MAPPING. The B2C question bank (elicitation_questions) is sorted into
 * ten older categories that are not the eight personal coverage areas. The six
 * that carry judgment map onto an area. senses, joy, and work are warm-ups about
 * the texture of a life and map to none: the planner never serves them, and
 * after the first ten answers the legacy path stops serving senses and joy too
 * (decided September 24, 2026). Risk and Money have no bank questions at all;
 * for those the planner serves the area's call opener (lib/areaSeeds.ts).
 */

import { supabaseAdmin } from './supabase-admin'
import { coverageSetForSegment, segmentForTier } from './coverageSet'
import type { CoverageState, OverreachLevel } from './coverage'

export interface AreaReading {
  area:      string
  state:     CoverageState
  overreach: OverreachLevel
  /** Position in the taxonomy, for stable tie-breaks. */
  order:     number
}

/** B2C bank category slug to personal coverage area. null: never aimed at. */
export const B2C_SLUG_TO_AREA: Record<string, string | null> = {
  decisions: 'Decision-Making',
  people:    'People',
  adversity: 'Adversity',
  values:    'Standards',
  worldview: 'Standards',
  forward:   'Direction',
  origins:   'Legacy',
  work:      null,
  senses:    null,
  joy:       null,
}

/** Bank categories that are warm-ups only, served before the first ten answers. */
export const WARMUP_SLUGS = ['senses', 'joy'] as const

export function areaForSlug(slug: string): string | null {
  return B2C_SLUG_TO_AREA[slug] ?? null
}

// ── Ranking ───────────────────────────────────────────────────────────────────

const STATE_NEED: Record<CoverageState, number>     = { open: 1.0, partial: 0.6, backed: 0.2 }
const OVERREACH_NEED: Record<OverreachLevel, number> = { high: 0.5, some: 0.25, none: 0 }

/** Starting weights. Reversible; tune on answer and coverage data. */
export function areaNeed(r: AreaReading): number {
  return STATE_NEED[r.state] + OVERREACH_NEED[r.overreach]
}

/**
 * Every area, neediest first, the area asked last moved to the end (never
 * dropped: if it is the only one left, it is still returned). Ties break on
 * taxonomy order so the result is stable.
 */
export function rankAreas(readings: AreaReading[], lastArea: string | null): AreaReading[] {
  const sorted = [...readings].sort((a, b) => areaNeed(b) - areaNeed(a) || a.order - b.order)
  if (!lastArea) return sorted
  return [...sorted.filter(r => r.area !== lastArea), ...sorted.filter(r => r.area === lastArea)]
}

/**
 * The order the caller should try areas in. With `random`, keeps the engine's
 * existing 80/20 split: 80 percent of the time the neediest area leads, 20
 * percent a uniformly random area other than the one asked last leads. The rest
 * follow in need order, so a caller that finds nothing to serve in the first
 * area falls through to the next.
 */
export function orderAreas(
  readings: AreaReading[],
  lastArea: string | null,
  random?: () => number,
): string[] {
  const ranked = rankAreas(readings, lastArea).map(r => r.area)
  if (!random || ranked.length < 2) return ranked

  if (random() < 0.8) return ranked
  const pool = ranked.filter(a => a !== lastArea)
  if (pool.length === 0) return ranked
  const pick = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
  return [pick, ...ranked.filter(a => a !== pick)]
}

// ── Succession opener choice ─────────────────────────────────────────────────

export interface Opener {
  /** 'incident' is a narrative seed from b2b_questions; 'area' is the area call seed. */
  kind:       'incident' | 'area'
  area:       string
  questionId: string | null
  text:       string
}

/**
 * For a succession Basalith: walk the areas in order and return the first
 * opener never run, else, once every opener has run, the least recently run one
 * in the neediest area. `lastRunAt` is keyed by openerKey().
 */
export function chooseOpener(
  areaOrder: string[],
  openers:   Opener[],
  lastRunAt: Map<string, number>,
): Opener | null {
  if (openers.length === 0) return null
  const inArea = (area: string) => openers.filter(o => o.area === area)

  for (const area of areaOrder) {
    const fresh = inArea(area).find(o => !lastRunAt.has(openerKey(o)))
    if (fresh) return fresh
  }

  for (const area of areaOrder) {
    const candidates = inArea(area)
    if (candidates.length === 0) continue
    return [...candidates].sort((a, b) => lastRunAt.get(openerKey(a))! - lastRunAt.get(openerKey(b))!)[0]
  }

  // Openers in areas the reading does not list: least recently run overall.
  return [...openers].sort((a, b) =>
    (lastRunAt.get(openerKey(a)) ?? -Infinity) - (lastRunAt.get(openerKey(b)) ?? -Infinity))[0]
}

export function openerKey(o: { kind: Opener['kind']; area: string; questionId: string | null }): string {
  return o.kind === 'incident' ? `incident:${o.questionId}` : `area:${o.area}`
}

// ── Loader ────────────────────────────────────────────────────────────────────

/**
 * The latest coverage reading for a Basalith, in its own segment's taxonomy and
 * probe set version. Empty when there is no reading yet or when the reading is
 * off-label; the caller then keeps its pre-planner behavior.
 */
export async function loadAreaReadings(archiveId: string, tier: string | null | undefined): Promise<AreaReading[]> {
  const set = coverageSetForSegment(segmentForTier(tier))

  const { data, error } = await supabaseAdmin
    .from('archive_coverage')
    .select('domain, state, overreach, last_run_id')
    .eq('archive_id', archiveId)
    .eq('probe_set_version', set.version)
  if (error) {
    console.warn('[questionPlanner] archive_coverage read failed:', error.message)
    return []
  }
  const rows = (data ?? []) as { domain: string; state: CoverageState; overreach: OverreachLevel; last_run_id: string | null }[]
  if (rows.length === 0) return []

  // Same rule as the owner map: an off-label reading is never acted on.
  const runId = rows.map(r => r.last_run_id).find(Boolean) ?? null
  if (runId) {
    const { data: run } = await supabaseAdmin
      .from('coverage_runs').select('off_label').eq('id', runId).maybeSingle()
    if ((run as { off_label?: boolean } | null)?.off_label) return []
  }

  const order = new Map(set.domains.map(d => [d.name, d.order]))
  return rows
    .filter(r => order.has(r.domain))
    .map(r => ({ area: r.domain, state: r.state, overreach: r.overreach ?? 'none', order: order.get(r.domain)! }))
}
