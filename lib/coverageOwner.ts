/**
 * The owner-facing coverage map.
 *
 * Reads what the coverage run already wrote (archive_coverage, coverage_runs)
 * and shapes it for the owner. Computes nothing. The run itself is
 * lib/coverageRun.ts, fired by Inngest on the monthly sweep and, since
 * September 15, 2026, once when a succession archive completes its Founding
 * Sequence.
 *
 * Rules carried from BASALITH_COVERAGE_MAP_STATE (August 2026):
 *   - Lead with counts. "4 of 6 questions here got a grounded answer" has a
 *     real, disclosed, versioned denominator. The state word is coarse sorting.
 *   - No archive-level score, in any version, ever.
 *   - Only basis='deposit' backs coverage language. Nothing here says complete,
 *     verified, or grounded in, and nothing is a percentage.
 *   - An off-label run (the business probe set against a personal archive) is
 *     diagnostic only and must not be shown to a customer. So the map is
 *     available to succession archives only, until a personal probe set exists.
 *   - The map reads the entity's most likely answer; a successor gets a sampled
 *     one. It must never be described as what the successor will experience.
 *
 * Labels are produced HERE, server side, so the client component never imports
 * lib/coverage.ts (which pulls the 48 probe questions into any bundle that
 * imports it, and probes are never rendered to a customer).
 */

import { supabaseAdmin } from './supabase-admin'
import { B2B_DOMAINS } from './b2bDomains'
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
  overreachLine: string | null
  held:          boolean    // hysteresis held this above the raw reading
  deposit:       number
  total:         number
}

export type OwnerCoverage =
  | { available: false; reason: 'not_succession' | 'off_label' | 'no_reading' }
  | {
      available:   true
      domains:     OwnerCoverageDomain[]
      computedAt:  string
      probeSet:    string
      complete:    boolean
      explainer:   string
      caveat:      string
    }

export const COVERAGE_CAVEAT =
  'This reads your entity’s most likely answer to each question. A successor gets a live answer, which can vary, so treat a thin domain as thinner than it looks here.'

/** "4 of 6 questions here got a grounded answer." Count-led, denominator shown. */
export function countLine(deposit: number, total: number): string {
  if (total <= 0) return 'No questions asked here yet'
  if (deposit === 0) return `None of ${total} questions here got a grounded answer`
  if (deposit === total) return `All ${total} questions here got a grounded answer`
  return `${deposit} of ${total} questions here got a grounded answer`
}

/** Pure. Shape rows for the owner in the domain order the dashboard uses. */
export function ownerCoverageFromRows(rows: OwnerCoverageRow[], run: OwnerCoverageRun | null): OwnerCoverage {
  if (rows.length === 0) return { available: false, reason: 'no_reading' }
  if (run?.off_label) return { available: false, reason: 'off_label' }

  const byDomain = new Map(rows.map(r => [r.domain, r]))
  const domains: OwnerCoverageDomain[] = []
  for (const d of [...B2B_DOMAINS].sort((a, b) => a.order - b.order)) {
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
      overreachLine: overreachLabel(r.state, r.overreach),
      held:          r.damped,
      deposit:       r.probes_deposit,
      total:         countable,
    })
  }
  if (domains.length === 0) return { available: false, reason: 'no_reading' }

  const computedAt = rows.map(r => r.computed_at).sort().at(-1) ?? new Date(0).toISOString()
  const probeSet   = rows[0].probe_set_version

  return {
    available: true,
    domains,
    computedAt,
    probeSet,
    complete:  run?.complete ?? true,
    explainer: OVERREACH_EXPLAINER,
    caveat:    COVERAGE_CAVEAT,
  }
}

/** Every owner-visible string this module produces, for the copy-rule test. */
export function allCoverageCopy(): string[] {
  return [
    COVERAGE_CAVEAT,
    OVERREACH_EXPLAINER,
    countLine(0, 6), countLine(4, 6), countLine(6, 6), countLine(0, 0),
    ...(['backed', 'partial', 'open'] as CoverageState[]).map(coverageStateLabel),
    ...(['none', 'some', 'high'] as OverreachLevel[]).map(l => overreachLabel('open', l) ?? ''),
  ]
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function loadOwnerCoverage(archiveId: string, tier: string | null | undefined): Promise<OwnerCoverage> {
  if (tier !== 'succession') return { available: false, reason: 'not_succession' }

  const { data: rowsData, error } = await supabaseAdmin
    .from('archive_coverage')
    .select('domain, state, overreach, probes_deposit, probes_total, probes_errored, damped, probe_set_version, last_run_id, computed_at')
    .eq('archive_id', archiveId)
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

  return ownerCoverageFromRows(rows, run)
}
