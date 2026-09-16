/**
 * The owner-facing coverage map.
 *
 * Reads what the coverage run already wrote (archive_coverage, coverage_runs)
 * and shapes it for the owner. Computes nothing. The run itself is
 * lib/coverageRun.ts, fired by Inngest on the monthly sweep and once when an
 * archive completes its Founding Sequence.
 *
 * Rules carried from BASALITH_COVERAGE_MAP_STATE (August 2026):
 *   - Lead with counts. "4 of 6 questions here got a grounded answer" has a
 *     real, disclosed, versioned denominator. The state word is coarse sorting.
 *   - No archive-level score, in any version, ever.
 *   - Only basis='deposit' backs coverage language. Nothing here says complete,
 *     verified, or grounded in, and nothing is a percentage.
 *   - An off-label run is diagnostic only and must not be shown to a customer.
 *   - The map reads the entity's most likely answer, not a conversation. It
 *     must never be described as what a successor or a family member will
 *     experience.
 *
 * Since September 15, 2026 the map is read per segment (lib/coverageSet.ts):
 * the business set and its eight domains for a succession archive, the
 * personal set and its eight for a family archive. Rows are filtered to the
 * segment's probe set version, so a row left behind by an earlier off-label
 * run under the other set (same archive, other domain names) is never shown.
 *
 * THE OVERREACH LINE RENDERS ONLY WHERE THE VERIFIER RUNS. Overreach measures
 * how often the entity reaches past the archive and is caught. On the
 * succession route the verifier always runs, so the explainer's claim that
 * reaching is caught before a successor sees it is true. On the family route
 * it runs only for an archive whose entity_pipeline is 'grounded'
 * (lib/familyEntity.ts, September 16, 2026). For a personal archive still on
 * 'context' the sentence would be false, so that archive gets the coverage
 * count only and a caveat that says it is a reading of the archive, not of a
 * conversation. The caller passes `verified`; this module never reads the
 * column itself.
 *
 * Labels are produced HERE, server side, so the client component never imports
 * lib/coverage.ts or either probe module (which would pull the probe questions
 * into a bundle, and probes are never rendered to a customer).
 */

import { supabaseAdmin } from './supabase-admin'
import { coverageSetForSegment, segmentForTier, type CoverageScope, type CoverageSet } from './coverageSet'
import {
  coverageStateLabel,
  overreachLabel,
  OVERREACH_EXPLAINER,
  type CoverageState,
  type OverreachLevel,
} from './coverage'

export type OwnerCoverageRow = {
  domain:            string
  state:             CoverageState
  overreach:         OverreachLevel
  probes_deposit:    number
  probes_total:      number
  probes_errored:    number
  damped:            boolean
  probe_set_version: string
  last_run_id:       string | null
  computed_at:       string
}

export type OwnerCoverageRun = {
  id:          string
  off_label:   boolean
  complete:    boolean | null
  ok:          boolean | null
  finished_at: string | null
}

export type OwnerCoverageDomain = {
  domain:        string
  description:   string
  countLine:     string     // "4 of 6 questions here got a grounded answer"
  stateLabel:    string     // coarse sorting word, from coverageStateLabel
  state:         CoverageState
  overreachLine: string | null   // null where the reader's route runs no verifier
  held:          boolean    // hysteresis held this above the raw reading
  deposit:       number
  total:         number
}

export type OwnerCoverage =
  | { available: false; reason: 'off_label' | 'no_reading' }
  | {
      available:   true
      scope:       CoverageScope
      domains:     OwnerCoverageDomain[]
      computedAt:  string
      probeSet:    string
      complete:    boolean
      intro:       string
      explainer:   string | null   // null where the reader's route runs no verifier
      caveat:      string
    }

// ── Copy, per scope ───────────────────────────────────────────────────────────

export const COVERAGE_INTRO: Record<CoverageScope, string> = {
  business:
    'Each domain is put to your entity as a fixed set of questions an operator in that domain has had to answer. A question counts only when the answer came from something you deposited, checked against your archive. This is a map of where your archive is still silent.',
  personal:
    'Each area is put to your entity as a fixed set of questions a person has had to answer for themselves, at home or at work. A question counts only when the answer came from something you deposited, checked against your archive. This is a map of where your archive is still silent.',
}

export const COVERAGE_CAVEAT: Record<CoverageScope, string> = {
  business:
    'This reads your entity’s most likely answer to each question. A successor gets a live answer, which can vary, so treat a thin domain as thinner than it looks here.',
  personal:
    'This is a reading of your archive, not of a conversation. Each question is asked once against what you have deposited and counts only when the answer came from a deposit. Talking with your entity is a live exchange and can go differently.',
}

/** The personal caveat once the family entity is on the grounded route. Same shape as the business one. */
export const COVERAGE_CAVEAT_PERSONAL_VERIFIED =
  'This reads your entity\u2019s most likely answer to each question. Your family gets a live answer, which can vary, so treat a thin area as thinner than it looks here.'

/** The explainer for a personal archive on the grounded route. "Successor" becomes "someone in your family." */
export const OVERREACH_EXPLAINER_PERSONAL =
  'Reaching past the archive is caught before anyone in your family sees it. What they get instead is your entity saying it did not settle the question. An area where this happens often is where your family hears that most, and where one deposit changes the most.'

/** "4 of 6 questions here got a grounded answer." Count-led, denominator shown. */
export function countLine(deposit: number, total: number): string {
  if (total <= 0) return 'No questions asked here yet'
  if (deposit === 0) return `None of ${total} questions here got a grounded answer`
  if (deposit === total) return `All ${total} questions here got a grounded answer`
  return `${deposit} of ${total} questions here got a grounded answer`
}

/**
 * Pure. Shape rows for the owner in the set's domain order. Rows under another
 * probe set version are ignored, not shown.
 */
export function ownerCoverageFromRows(
  rows: OwnerCoverageRow[],
  run: OwnerCoverageRun | null,
  set: CoverageSet = coverageSetForSegment('succession'),
  /**
   * Whether the route this archive's readers actually use runs the verifier.
   * Always true for business. For personal, true only once
   * archives.entity_pipeline is 'grounded'. Governs the overreach line, the
   * explainer, and which caveat renders.
   */
  verified: boolean = set.scope === 'business',
): OwnerCoverage {
  const showOverreach = set.scope === 'business' || verified
  const own = rows.filter(r => r.probe_set_version === set.version)
  if (own.length === 0) return { available: false, reason: 'no_reading' }
  if (run?.off_label) return { available: false, reason: 'off_label' }

  const byDomain = new Map(own.map(r => [r.domain, r]))
  const domains: OwnerCoverageDomain[] = []
  for (const d of [...set.domains].sort((a, b) => a.order - b.order)) {
    const r = byDomain.get(d.name)
    if (!r) continue
    // probes_total is already the usable count: rollUpRun in lib/coverage.ts
    // sets probesTotal to the probes whose verdict was not discarded, and
    // probes_errored is carried beside it, not inside it. Subtracting again
    // would shrink the denominator twice. VERIFIED against rollUpRun and
    // supabaseCoverageStore.writeCoverage, September 15, 2026.
    const countable = Math.max(0, r.probes_total)
    domains.push({
      domain:        d.name,
      description:   d.description,
      countLine:     countLine(r.probes_deposit, countable),
      stateLabel:    coverageStateLabel(r.state),
      state:         r.state,
      overreachLine: showOverreach ? overreachLabel(r.state, r.overreach) : null,
      held:          r.damped,
      deposit:       r.probes_deposit,
      total:         countable,
    })
  }
  if (domains.length === 0) return { available: false, reason: 'no_reading' }

  const computedAt = own.map(r => r.computed_at).sort().at(-1) ?? new Date(0).toISOString()

  return {
    available: true,
    scope:     set.scope,
    domains,
    computedAt,
    probeSet:  set.version,
    complete:  run?.complete ?? true,
    intro:     COVERAGE_INTRO[set.scope],
    explainer: set.scope === 'business' ? OVERREACH_EXPLAINER : showOverreach ? OVERREACH_EXPLAINER_PERSONAL : null,
    caveat:    set.scope === 'business' ? COVERAGE_CAVEAT.business : showOverreach ? COVERAGE_CAVEAT_PERSONAL_VERIFIED : COVERAGE_CAVEAT.personal,
  }
}

/** Every owner-visible string this module produces, for the copy-rule test. */
export function allCoverageCopy(): string[] {
  return [
    COVERAGE_INTRO.business, COVERAGE_INTRO.personal,
    COVERAGE_CAVEAT.business, COVERAGE_CAVEAT.personal, COVERAGE_CAVEAT_PERSONAL_VERIFIED,
    OVERREACH_EXPLAINER, OVERREACH_EXPLAINER_PERSONAL,
    countLine(0, 6), countLine(4, 6), countLine(6, 6), countLine(0, 0),
    ...(['backed', 'partial', 'open'] as CoverageState[]).map(coverageStateLabel),
    ...(['none', 'some', 'high'] as OverreachLevel[]).map(l => overreachLabel('open', l) ?? ''),
  ]
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function loadOwnerCoverage(
  archiveId: string,
  tier: string | null | undefined,
  /** archives.entity_pipeline === 'grounded'. Irrelevant for succession. */
  familyVerified: boolean = false,
): Promise<OwnerCoverage> {
  const set = coverageSetForSegment(segmentForTier(tier))

  const { data: rowsData, error } = await supabaseAdmin
    .from('archive_coverage')
    .select('domain, state, overreach, probes_deposit, probes_total, probes_errored, damped, probe_set_version, last_run_id, computed_at')
    .eq('archive_id', archiveId)
    .eq('probe_set_version', set.version)
  if (error) throw new Error(`loadOwnerCoverage failed: ${error.message}`)

  const rows = (rowsData ?? []) as OwnerCoverageRow[]
  if (rows.length === 0) return { available: false, reason: 'no_reading' }

  const runId = rows.map(r => r.last_run_id).find(Boolean) ?? null
  let run: OwnerCoverageRun | null = null
  if (runId) {
    const { data } = await supabaseAdmin
      .from('coverage_runs')
      .select('id, off_label, complete, ok, finished_at')
      .eq('id', runId)
      .maybeSingle()
    run = (data as OwnerCoverageRun | null) ?? null
  }

  return ownerCoverageFromRows(rows, run, set, set.scope === 'business' || familyVerified)
}
