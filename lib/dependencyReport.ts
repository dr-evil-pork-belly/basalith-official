/**
 * Key person dependency report, pure core. Slice 1, October 7, 2026.
 *
 * Takes the founder's intake answers and the probe results of two coverage
 * runs, and returns the data a report page renders. No DB, no model, no IO.
 * Nothing calls this yet: the table, the assessment sequence, the page, and the
 * order flow are later slices.
 *
 * TWO READINGS PER DOMAIN, NEVER BLENDED.
 *
 *   DEPENDENCY  who makes this kind of decision today. The founder's own
 *               statement (lib/dependencyIntake.ts). Not checked by anything.
 *   CAPTURE     how many of the domain's fixed questions the entity answered
 *               from a deposit, as judged by the production verifier. Measured
 *               by lib/coverageRun.ts, rolled up by lib/coverage.ts.
 *
 * RULES CARRIED FROM lib/coverage.ts AND lib/coverageOwner.ts.
 *
 *   - Counts lead. `state` is not read here at all: 'backed' needs every probe
 *     to land and the thresholds are not calibrated, so nearly every domain
 *     with any deposit reads 'partial' and the word separates nothing.
 *   - The one category used is threshold free: a domain is SILENT when no
 *     question got a grounded answer on either reading.
 *   - No overall score, in any version. The headline is a count of domains and
 *     a count of questions, each with its real denominator.
 *   - No hysteresis. Each run is rolled up with no previous state, so a report
 *     number is never a damped one. archive_coverage is not this file's source.
 *   - Overreach is not reported. Its copy speaks to a founder about a
 *     successor, and its level has no minimum denominator (finding of
 *     September 15, 2026). A third party would be misled by it.
 *
 * WHY TWO RUNS. The verifier is not deterministic: about one probe in five
 * changes basis between identical runs. Two distinct runs are required and
 * both counts are printed. Where they differ the report shows both figures and
 * never picks one.
 *
 * WHAT THIS FILE DOES NOT DO. It shows no deposit as evidence for an answer.
 * Nothing in the pipeline identifies which deposit an answer rests on
 * (reliance probe recon R1, September 30, 2026), so a quoted deposit beside a
 * count would be an attribution nobody made.
 *
 * Rendered strings are copy: no em dashes, no exclamation points, American
 * English, no percentages.
 */

import { B2B_DOMAINS } from './b2bDomains'
import { COVERAGE_PROBES, PROBES_PER_DOMAIN, PROBE_SET_VERSION } from './coverageProbes'
import { rollUpRun, type ProbeResult } from './coverage'
import {
  DEPENDENCY_ATTRIBUTION,
  DEPENDENCY_REPORT_LABEL,
  type DependencyAnswer,
  type DependencyResponse,
} from './dependencyIntake'

/**
 * The fewest usable verdicts a domain may have on a reading and still be
 * reported. A verdict discarded as a verifier failure is not evidence either
 * way and leaves the denominator, so a domain can fall below six. Below this
 * floor the count is too thin to print and the report is refused.
 *
 * NOT CALIBRATED. Reversible class: set by judgment, to be tuned on real runs.
 */
export const MIN_USABLE_PROBES = 4

export type ReportRun = {
  runId:           string
  probeSetVersion: string
  results:         ProbeResult[]
}

export type ReportInput = {
  /** Validated intake, one per domain (validateIntake in lib/dependencyIntake.ts). */
  responses:     DependencyResponse[]
  /** Domain names with a closed area call. The minimum record is all eight. */
  areasCaptured: string[]
  /** Two distinct, complete coverage runs under the business probe set. */
  runs:          [ReportRun, ReportRun]
}

export type CaptureReading = {
  /** Questions answered from a deposit. */
  deposit: number
  /** Usable verdicts. The denominator. Excludes errored. */
  total:   number
  /** Verdicts discarded as verifier failures. */
  errored: number
}

export type ReportDomain = {
  domain:          string
  description:     string
  order:           number
  answer:          DependencyAnswer
  dependencyLabel: string
  /** The other person's role as the founder typed it, or null. */
  role:            string | null
  readings:        [CaptureReading, CaptureReading]
  /** No question got a grounded answer on either reading. */
  silent:          boolean
  /** Both readings gave the same count over the same denominator. */
  readingsAgree:   boolean
  countLine:       string
}

export type UnavailableReason =
  | 'intake_incomplete'
  | 'record_incomplete'
  | 'run_mismatch'
  | 'run_incomplete'

export type DependencyReport =
  | { available: false; reason: UnavailableReason; detail: string[] }
  | {
      available:          true
      probeSetVersion:    string
      runIds:             [string, string]
      questionsPerDomain: number
      attribution:        string
      /** One to four sentences. Counts only. */
      headline:           string[]
      /** All eight, in domain order. */
      domains:            ReportDomain[]
      /**
       * Domains the founder is part of ('founder' first, then 'shared'),
       * thinnest record first. 'delegated' domains are not exposure.
       */
      exposure:           ReportDomain[]
      limits:             string[]
    }

// ── Copy ──────────────────────────────────────────────────────────────────────

/** "4 of 6 questions got a grounded answer on both readings." Count led, denominator shown. */
export function reportCountLine(a: CaptureReading, b: CaptureReading): string {
  const one = (r: CaptureReading) => `${r.deposit} of ${r.total}`
  if (a.deposit === b.deposit && a.total === b.total) {
    if (a.deposit === 0)       return `None of ${a.total} questions got a grounded answer on either reading`
    if (a.deposit === a.total) return `All ${a.total} questions got a grounded answer on both readings`
    return `${one(a)} questions got a grounded answer on both readings`
  }
  return `${one(a)} questions got a grounded answer on one reading, ${one(b)} on the other`
}

const LIMIT_DEPENDENCY =
  'Who makes each kind of decision is the founder’s own statement. Nobody else was asked.'

const LIMIT_METHOD =
  `Each domain was put to the founder’s entity as ${PROBES_PER_DOMAIN} fixed questions, and the full set was run twice. A question counts only when the answer came from something the founder deposited, checked against the record.`

const LIMIT_LIVE =
  'Each reading takes the entity’s most likely answer. A live answer can vary, so treat a thin domain as thinner than it looks here.'

const LIMIT_SCOPE =
  'This report looked at no financial statements, contracts, staff, or customers.'

const LIMIT_SCORE =
  'This report gives counts and no overall score.'

function erroredLine(n: number): string {
  return n === 1
    ? '1 answer could not be checked and was left out of the counts.'
    : `${n} answers could not be checked and were left out of the counts.`
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function headlineFor(domains: ReportDomain[]): string[] {
  const all     = domains.length
  const founder = domains.filter(d => d.answer === 'founder')
  const shared  = domains.filter(d => d.answer === 'shared')
  const n       = founder.length
  const lines: string[] = []

  if (n === 0)        lines.push(`None of the ${all} domains runs through the founder alone, as the founder states it.`)
  else if (n === all) lines.push(`All ${all} domains run through the founder, as the founder states it.`)
  else if (n === 1)   lines.push(`1 of ${all} domains runs through the founder, as the founder states it.`)
  else                lines.push(`${n} of ${all} domains run through the founder, as the founder states it.`)

  if (shared.length === 1) lines.push(n === 0 ? '1 is shared with someone else.' : '1 more is shared with someone else.')
  if (shared.length > 1)   lines.push(n === 0 ? `${shared.length} are shared with someone else.` : `${shared.length} more are shared with someone else.`)

  if (n === 0) return lines

  const sum = (i: 0 | 1): CaptureReading => ({
    deposit: founder.reduce((s, d) => s + d.readings[i].deposit, 0),
    total:   founder.reduce((s, d) => s + d.readings[i].total, 0),
    errored: 0,
  })
  const a = sum(0)
  const b = sum(1)
  const where = n === 1 ? 'In that domain' : `Across those ${n}`
  if (a.deposit === b.deposit && a.total === b.total) {
    lines.push(`${where}, ${a.deposit} of ${a.total} questions got a grounded answer from the record on both readings.`)
  } else {
    lines.push(`${where}, ${a.deposit} of ${a.total} questions got a grounded answer from the record on one reading and ${b.deposit} of ${b.total} on the other.`)
  }

  const silent = founder.filter(d => d.silent).map(d => d.domain)
  if (n === 1 && silent.length === 1) {
    lines.push('The record had nothing there on either reading.')
  } else if (silent.length > 0) {
    lines.push(`${silent.length} of those ${n} had nothing on the record on either reading: ${joinNames(silent)}.`)
  }
  return lines
}

/** Every fixed string and one worked example of each generated one, for the copy rule test. */
export function allDependencyReportCopy(): string[] {
  const r = (deposit: number, total = PROBES_PER_DOMAIN): CaptureReading => ({ deposit, total, errored: 0 })
  return [
    LIMIT_DEPENDENCY, LIMIT_METHOD, LIMIT_LIVE, LIMIT_SCOPE, LIMIT_SCORE,
    erroredLine(1), erroredLine(3),
    reportCountLine(r(0), r(0)),
    reportCountLine(r(PROBES_PER_DOMAIN), r(PROBES_PER_DOMAIN)),
    reportCountLine(r(4), r(4)),
    reportCountLine(r(3), r(4)),
  ]
}

// ── Build ─────────────────────────────────────────────────────────────────────

const ANSWER_RANK: Record<DependencyAnswer, number> = { founder: 0, shared: 1, delegated: 2 }

/**
 * Build the report, or say exactly why it cannot be built.
 *
 * Refusals, checked in this order, each with the offending names in `detail`:
 *
 *   intake_incomplete  a domain has no response, or two
 *   record_incomplete  a domain has no closed area call
 *   run_mismatch       the two runs are the same run, or either is not under
 *                      the live business probe set
 *   run_incomplete     on either run, a domain was not put all its questions,
 *                      a result names an unknown probe, or fewer than
 *                      MIN_USABLE_PROBES verdicts were usable
 *
 * There is no partial report. A report on seven domains, or on one reading, is
 * a different claim from the one the page makes.
 */
export function buildDependencyReport(input: ReportInput): DependencyReport {
  const live = B2B_DOMAINS.map(d => d.name)

  // Intake: exactly one response per live domain.
  const byDomain = new Map<string, DependencyResponse>()
  const twice: string[] = []
  for (const r of input.responses) {
    if (!live.includes(r.domain)) continue
    if (byDomain.has(r.domain)) twice.push(r.domain)
    else byDomain.set(r.domain, r)
  }
  const unanswered = live.filter(d => !byDomain.has(d))
  if (unanswered.length > 0 || twice.length > 0) {
    return { available: false, reason: 'intake_incomplete', detail: [...unanswered, ...twice] }
  }

  // Minimum record: one closed area call per domain.
  const captured = new Set(input.areasCaptured)
  const uncaptured = live.filter(d => !captured.has(d))
  if (uncaptured.length > 0) {
    return { available: false, reason: 'record_incomplete', detail: uncaptured }
  }

  // Two distinct runs under the live business set.
  const [runA, runB] = input.runs
  if (!runA.runId || !runB.runId || runA.runId === runB.runId) {
    return { available: false, reason: 'run_mismatch', detail: ['the two readings must be two different runs'] }
  }
  const stale = [runA, runB].filter(r => r.probeSetVersion !== PROBE_SET_VERSION).map(r => r.runId)
  if (stale.length > 0) {
    return { available: false, reason: 'run_mismatch', detail: stale.map(id => `run ${id} is not under probe set ${PROBE_SET_VERSION}`) }
  }

  // Every probe of the set, once, on each run.
  const expected = new Map(COVERAGE_PROBES.map(p => [p.key, p.domain]))
  const incomplete: string[] = []
  for (const run of [runA, runB]) {
    const seen = new Set<string>()
    for (const r of run.results) {
      if (expected.get(r.probeKey) !== r.domain) incomplete.push(`run ${run.runId}: unknown probe ${r.probeKey}`)
      else if (seen.has(r.probeKey)) incomplete.push(`run ${run.runId}: probe ${r.probeKey} appears twice`)
      else seen.add(r.probeKey)
    }
    for (const key of expected.keys()) {
      if (!seen.has(key)) incomplete.push(`run ${run.runId}: probe ${key} has no result`)
    }
  }
  if (incomplete.length > 0) {
    return { available: false, reason: 'run_incomplete', detail: incomplete }
  }

  // No previous state is passed, so nothing here is damped.
  const rollA = rollUpRun(runA.results)
  const rollB = rollUpRun(runB.results)

  const thin: string[] = []
  const domains: ReportDomain[] = B2B_DOMAINS.map(d => {
    const a = rollA.find(r => r.domain === d.name)!
    const b = rollB.find(r => r.domain === d.name)!
    const readings: [CaptureReading, CaptureReading] = [
      { deposit: a.probesDeposit, total: a.probesTotal, errored: a.probesErrored },
      { deposit: b.probesDeposit, total: b.probesTotal, errored: b.probesErrored },
    ]
    if (a.probesTotal < MIN_USABLE_PROBES) thin.push(`run ${runA.runId}: ${d.name} has ${a.probesTotal} usable answers`)
    if (b.probesTotal < MIN_USABLE_PROBES) thin.push(`run ${runB.runId}: ${d.name} has ${b.probesTotal} usable answers`)

    const response = byDomain.get(d.name)!
    return {
      domain:          d.name,
      description:     d.description,
      order:           d.order,
      answer:          response.answer,
      dependencyLabel: DEPENDENCY_REPORT_LABEL[response.answer],
      role:            response.answer === 'founder' ? null : response.role,
      readings,
      silent:          readings[0].deposit === 0 && readings[1].deposit === 0,
      readingsAgree:   readings[0].deposit === readings[1].deposit && readings[0].total === readings[1].total,
      countLine:       reportCountLine(readings[0], readings[1]),
    }
  })
  if (thin.length > 0) {
    return { available: false, reason: 'run_incomplete', detail: thin }
  }

  // Thinnest first, by the lower of the two readings, so a domain is never
  // ranked safer than its weaker reading.
  const low = (d: ReportDomain) => Math.min(d.readings[0].deposit, d.readings[1].deposit)
  const exposure = domains
    .filter(d => d.answer !== 'delegated')
    .sort((x, y) =>
      ANSWER_RANK[x.answer] - ANSWER_RANK[y.answer] ||
      low(x) - low(y) ||
      x.order - y.order,
    )

  const errored = domains.reduce((s, d) => s + d.readings[0].errored + d.readings[1].errored, 0)
  const limits = [LIMIT_DEPENDENCY, LIMIT_METHOD, LIMIT_LIVE, LIMIT_SCOPE, LIMIT_SCORE]
  if (errored > 0) limits.push(erroredLine(errored))

  return {
    available:          true,
    probeSetVersion:    PROBE_SET_VERSION,
    runIds:             [runA.runId, runB.runId],
    questionsPerDomain: PROBES_PER_DOMAIN,
    attribution:        DEPENDENCY_ATTRIBUTION,
    headline:           headlineFor(domains),
    domains,
    exposure,
    limits,
  }
}
