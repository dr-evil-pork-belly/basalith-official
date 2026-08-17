/**
 * Coverage map, pure core.
 *
 * Rolls per-probe verifier bases up into a per-domain reading. No DB, no model,
 * no IO. lib/coverageRun.ts and scripts/coverage-fixture-probe.ts both call this,
 * so the shipped map and the validated map cannot drift.
 *
 * THE RULE. Coverage is MEASURED, never inferred. A domain is 'backed' because
 * the entity was asked and the verifier returned basis='deposit'. It is never
 * backed because deposits were tagged to it, or because N deposits exist in it.
 * The moment coverage is computed from counts it is the density vanity number in
 * a new shirt. There is deliberately no function in this file that takes a
 * deposit count.
 *
 * NO ARCHIVE-LEVEL SCORE. There is no rollup number, in any version, ever. A
 * headline figure invites a denominator and there is not an honest one.
 *
 * TWO DIMENSIONS, NOT ONE. See OVERREACH below. v1 of this file collapsed
 * 'no_position' and 'unsupported' into a single "did not back coverage" bucket.
 * That is correct for the coverage dimension and it threw away the most
 * actionable signal in the data.
 */

import type { GroundingBasis } from './verifyGrounding'
import { B2B_DOMAINS } from './b2bDomains'
import { COVERAGE_PROBES, PROBES_PER_DOMAIN } from './coverageProbes'

/**
 * DIMENSION ONE: is there deposited ground here.
 *
 * 'backed'  every probe in the domain returned basis='deposit'
 * 'partial' at least one, but not all, did
 * 'open'    none did
 */
export type CoverageState = 'backed' | 'partial' | 'open'

/**
 * DIMENSION TWO: when the entity had no deposited ground, what did it do.
 *
 * Computed only over the probes that did NOT land on a deposit, because the
 * question only arises there. Among those:
 *
 *   'no_position'  the draft declined, hedged, or reasoned without landing on a
 *                  stance. The entity knew it did not know.
 *   'unsupported'  the draft committed a founder position no deposit takes. The
 *                  entity reached past the archive.
 *
 * 'none' no reaching. 'some' a minority. 'high' a majority.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. In production, an 'unsupported' draft
 * never ships: app/api/succession/entity/chat/route.ts replaces it with
 * groundingGapReply. So this does NOT measure what a successor sees. It measures
 * how hard the verifier is working, which is the same thing as how often a
 * successor asking in this domain hears "I did not settle this" instead of an
 * answer.
 *
 * An open domain with overreach 'none' is a quiet gap. An open domain with
 * overreach 'high' is where the successor will hit the most refusals, and
 * therefore where a deposit buys the most. That is the ranking a founder
 * actually needs and coverage state alone cannot express it.
 */
export type OverreachLevel = 'none' | 'some' | 'high'

export type ProbeResult = {
  probeKey: string
  domain:   string
  basis:    GroundingBasis
  /**
   * True when the verdict came from verifyGrounding's catch path rather than
   * from the auditor. See VERIFIER_FAILSAFE in coverageRun.ts.
   *
   * That path returns basis='unsupported' by design, which is right for
   * production (never ship an unverified founder position) and WRONG as
   * measurement: a JSON parse failure would be recorded as "the entity reached
   * past the archive," depressing coverage and inflating overreach on evidence
   * that does not exist. An errored probe is excluded from both dimensions and
   * counted separately instead.
   */
  verifierErrored?: boolean
}

export type DomainRollup = {
  domain:          string
  state:           CoverageState
  overreach:       OverreachLevel
  probesDeposit:   number
  /** Verdicts discarded as verifier failures. Not evidence in either direction. */
  probesErrored:   number
  /** basis='unsupported'. The entity reached past the archive. */
  probesOverreach: number
  /** basis='no_position'. The entity declined or hedged. */
  probesDeclined:  number
  probesTotal:     number
  /** True when hysteresis held the state above what this run alone would give. */
  damped:          boolean
}

/**
 * Customer-facing labels. Only basis='deposit' backs coverage language, so no
 * label here says complete, verified, or grounded in, and none is a percentage.
 * See the verifier-semantics rule in BUILD_CONTEXT decision 9.
 */
export function coverageStateLabel(state: CoverageState): string {
  switch (state) {
    case 'backed':  return 'Backed by your archive'
    case 'partial': return 'Partly backed'
    case 'open':    return 'Nothing here yet'
  }
}

/**
 * Null on a fully backed domain, where the question does not arise.
 *
 * The wording is careful and the care is not decorative. It must not suggest a
 * successor is shown an invented answer, because they are not: the verifier
 * replaces an overreaching draft before it ships. These sentences describe what
 * the model reaches for, not what anyone receives. OVERREACH_EXPLAINER carries
 * the rest and must render alongside them.
 */
export function overreachLabel(state: CoverageState, level: OverreachLevel): string | null {
  if (state === 'backed') return null
  switch (level) {
    case 'none': return 'Your entity stops here rather than guessing'
    case 'some': return 'Your entity sometimes reaches past the archive here'
    case 'high': return 'Your entity reaches past the archive here more often than not'
  }
}

export const OVERREACH_EXPLAINER =
  'Reaching past the archive is caught before a successor sees it. What they get instead is your entity saying it did not settle the question. A domain where this happens often is where a successor hears that most, and where one deposit changes the most.'

/**
 * Raw coverage state from one run's bases, before hysteresis.
 *
 * THRESHOLDS ARE NOT YET CALIBRATED, and are deliberately left strict until
 * they can be set against a stable measurement. 'backed' currently requires
 * every probe to land, which the 20-pair frozen-layer cap makes unreachable, so
 * in practice every non-empty domain reads 'partial' today.
 *
 * That degeneracy is visible on purpose. Relaxing the bar to a majority makes
 * the map informative and, on the measured drift, unstable: more boundaries
 * means more crossings. The honest order is to reduce drift first (see the
 * temperature note in coverageRun.ts) and set thresholds against clean data
 * afterward. Tuning a threshold to make a noisy gate go green is how the first
 * two versions of this gate got written.
 */
export function rollUpDomainState(bases: GroundingBasis[]): CoverageState {
  if (bases.length === 0) return 'open'
  const deposits = bases.filter(b => b === 'deposit').length
  if (deposits === 0)            return 'open'
  if (deposits === bases.length) return 'backed'
  return 'partial'
}

/** Overreach level over the non-deposit probes only. */
export function rollUpOverreach(bases: GroundingBasis[]): OverreachLevel {
  const ungrounded = bases.filter(b => b !== 'deposit')
  if (ungrounded.length === 0) return 'none'
  const reached = ungrounded.filter(b => b === 'unsupported').length
  if (reached === 0) return 'none'
  return reached * 2 > ungrounded.length ? 'high' : 'some'
}

/**
 * Damp downward moves in coverage state.
 *
 * The verifier is not deterministic. The v1 fixture run measured 21 to 29
 * percent of probes changing basis across two identical runs on an identical
 * fixture. A single noisy run must not blank a domain a founder has genuinely
 * covered, because the customer-visible consequence of a false 'open' is telling
 * someone their judgment is missing when it is not.
 *
 * Upward moves apply immediately. A domain never falls further than one step in
 * one run. Two consecutive weak runs still reach 'open', so a real regression is
 * reported, one run later.
 *
 * Overreach is NOT damped. It is a behavioral reading of one run rather than a
 * claim about the archive, and a false 'some' costs a founder nothing.
 */
export function applyHysteresis(previous: CoverageState | null, next: CoverageState): CoverageState {
  if (previous === null) return next
  if (previous === 'backed' && next === 'open') return 'partial'
  return next
}

const RANK: Record<CoverageState, number> = { open: 0, partial: 1, backed: 2 }

/**
 * Roll a full run up into one row per live domain.
 *
 * Every domain in B2B_DOMAINS gets a row even if the run produced no result for
 * it, because a domain missing from the map reads as an absent feature rather
 * than an absent answer. A domain with no results is 'open' with 0 probes, which
 * is the truthful reading.
 *
 * Results naming a domain that is not live are ignored rather than throwing: the
 * probe set asserts its own shape at import, so this can only happen if the live
 * domain list changed under a stored run, and a stale probe should not take down
 * a whole computation.
 */
export function rollUpRun(
  results: ProbeResult[],
  previousByDomain: Record<string, CoverageState> = {},
): DomainRollup[] {
  return B2B_DOMAINS.map(d => {
    const forDomain = results.filter(r => r.domain === d.name)
    const usable    = forDomain.filter(r => !r.verifierErrored)
    const bases     = usable.map(r => r.basis)
    const raw       = rollUpDomainState(bases)
    const previous  = previousByDomain[d.name] ?? null
    const state     = applyHysteresis(previous, raw)

    return {
      domain:          d.name,
      state,
      overreach:       rollUpOverreach(bases),
      probesDeposit:   bases.filter(b => b === 'deposit').length,
      probesOverreach: bases.filter(b => b === 'unsupported').length,
      probesDeclined:  bases.filter(b => b === 'no_position').length,
      probesErrored:   forDomain.length - usable.length,
      probesTotal:     usable.length,
      damped:          RANK[state] > RANK[raw],
    }
  })
}

/** Total probes a full run should attempt. Derived, never hardcoded elsewhere. */
export function expectedProbeCount(): number {
  return COVERAGE_PROBES.length
}

/**
 * A run is complete when every domain got its full probe set. An incomplete run
 * is still written (a partial map beats no map) but it is flagged, because a
 * domain that came back 'open' after two probes timed out is not the same claim
 * as one that came back 'open' after six.
 */
export function isRunComplete(rollups: DomainRollup[]): boolean {
  return rollups.every(r => r.probesTotal === PROBES_PER_DOMAIN)
}

/**
 * DISCRIMINATION. The gap in deposit count between the best-covered and
 * worst-covered domain, in probes.
 *
 * This is what the fixture gate should test, and testing a `backed` threshold
 * instead was a mistake. `backed` requires every probe in a domain to land on a
 * deposit, and the succession route caps the frozen layer at 20 training pairs
 * (route.ts limit(20)). Spread across eight domains that is between two and
 * three pairs per domain, so a six-of-six domain is unreachable for ANY archive,
 * however dense. A gate keyed to it can never pass and says nothing about the
 * map when it fails.
 *
 * What the map actually has to do is say DIFFERENT things about different
 * domains. Spread measures that directly and does not depend on where the
 * state thresholds happen to sit, which matters because those thresholds are
 * not yet calibrated (see the note on rollUpDomainState).
 */
export function depositSpread(rollups: DomainRollup[]): number {
  const counts = rollups.map(r => r.probesDeposit)
  if (counts.length === 0) return 0
  return Math.max(...counts) - Math.min(...counts)
}

/**
 * How many domains read differently between two runs. Probe-level drift is
 * expected and tolerable. DOMAIN-level drift is the failure that matters, since
 * the domain is what a founder is shown. The fixture gate asserts on this.
 */
export function domainStateDrift(a: DomainRollup[], b: DomainRollup[]): string[] {
  const byDomain = new Map(b.map(r => [r.domain, r.state]))
  return a.filter(r => byDomain.get(r.domain) !== r.state).map(r => r.domain)
}
