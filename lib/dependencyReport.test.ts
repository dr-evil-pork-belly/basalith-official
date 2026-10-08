import { describe, it, expect } from 'vitest'
import { B2B_DOMAINS } from './b2bDomains'
import { COVERAGE_PROBES, PROBES_PER_DOMAIN, PROBE_SET_VERSION } from './coverageProbes'
import type { ProbeResult } from './coverage'
import type { GroundingBasis } from './verifyGrounding'
import {
  DEPENDENCY_QUESTIONS,
  DEPENDENCY_REPORT_LABEL,
  ROLE_MAX_LENGTH,
  allDependencyIntakeCopy,
  validateIntake,
  type DependencyAnswer,
  type DependencyResponse,
} from './dependencyIntake'
import {
  MIN_USABLE_PROBES,
  allDependencyReportCopy,
  buildDependencyReport,
  reportCountLine,
  type ReportInput,
  type ReportRun,
} from './dependencyReport'

const DOMAINS = B2B_DOMAINS.map(d => d.name)

/** A full run: `deposits[domain]` of the six probes land on a deposit, the rest decline. */
function run(runId: string, deposits: Record<string, number> = {}, errored: Record<string, number> = {}): ReportRun {
  const seen: Record<string, number> = {}
  const results: ProbeResult[] = COVERAGE_PROBES.map(p => {
    const i = (seen[p.domain] = (seen[p.domain] ?? 0) + 1)
    const isErrored = i > PROBES_PER_DOMAIN - (errored[p.domain] ?? 0)
    const basis: GroundingBasis = isErrored ? 'unsupported' : i <= (deposits[p.domain] ?? 0) ? 'deposit' : 'no_position'
    return { probeKey: p.key, domain: p.domain, basis, verifierErrored: isErrored }
  })
  return { runId, probeSetVersion: PROBE_SET_VERSION, results }
}

function responses(answers: Partial<Record<string, DependencyAnswer>> = {}): DependencyResponse[] {
  return DOMAINS.map(domain => {
    const answer = answers[domain] ?? 'founder'
    return { domain, answer, role: answer === 'founder' ? null : 'Operations lead' }
  })
}

function input(over: Partial<ReportInput> = {}): ReportInput {
  return {
    responses:     responses(),
    areasCaptured: DOMAINS,
    runs:          [run('run-a'), run('run-b')],
    ...over,
  }
}

describe('dependency intake', () => {
  it('asks one question per live business domain, in order', () => {
    expect(DEPENDENCY_QUESTIONS.map(q => q.domain)).toEqual(DOMAINS)
  })

  it('accepts a full submission and keeps a role only where someone else is involved', () => {
    const raw = DOMAINS.map((domain, i) => ({
      domain,
      answer: (['founder', 'shared', 'delegated'] as const)[i % 3],
      role:   '  General manager  ',
    }))
    const r = validateIntake(raw)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.responses.map(x => x.domain)).toEqual(DOMAINS)
    expect(r.responses[0]).toEqual({ domain: DOMAINS[0], answer: 'founder', role: null })
    expect(r.responses[1]).toEqual({ domain: DOMAINS[1], answer: 'shared', role: 'General manager' })
    expect(r.responses[2].role).toBe('General manager')
  })

  it('refuses a partial or malformed submission and names the domains', () => {
    const raw = [
      { domain: 'People', answer: 'founder' },
      { domain: 'Risk', answer: 'mostly me' },
      { domain: 'Not A Domain', answer: 'founder' },
    ]
    const r = validateIntake(raw)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.invalid).toEqual(['Risk'])
    expect(r.missing).toEqual(DOMAINS.filter(d => d !== 'People' && d !== 'Risk'))
    expect(validateIntake(null)).toEqual({ ok: false, missing: DOMAINS, invalid: [] })
  })

  it('cuts a long role and drops a blank one', () => {
    const raw = DOMAINS.map(domain => ({ domain, answer: 'delegated', role: domain === 'Risk' ? '   ' : 'x'.repeat(500) }))
    const r = validateIntake(raw)
    if (!r.ok) throw new Error('expected ok')
    expect(r.responses.find(x => x.domain === 'Risk')?.role).toBeNull()
    expect(r.responses.find(x => x.domain === 'People')?.role).toHaveLength(ROLE_MAX_LENGTH)
  })
})

describe('dependency report, refusals', () => {
  it('refuses when a domain has no response or two', () => {
    const missing = buildDependencyReport(input({ responses: responses().filter(r => r.domain !== 'Capital') }))
    expect(missing).toEqual({ available: false, reason: 'intake_incomplete', detail: ['Capital'] })
    const doubled = buildDependencyReport(input({ responses: [...responses(), responses()[0]] }))
    expect(doubled).toEqual({ available: false, reason: 'intake_incomplete', detail: [DOMAINS[0]] })
  })

  it('refuses until every domain has a closed area call', () => {
    const r = buildDependencyReport(input({ areasCaptured: DOMAINS.filter(d => d !== 'Culture' && d !== 'Risk') }))
    expect(r).toEqual({ available: false, reason: 'record_incomplete', detail: ['Risk', 'Culture'] })
  })

  it('refuses one run counted twice, and a run under another probe set', () => {
    const same = buildDependencyReport(input({ runs: [run('run-a'), run('run-a')] }))
    expect(same.available).toBe(false)
    if (!same.available) expect(same.reason).toBe('run_mismatch')

    const old = buildDependencyReport(input({ runs: [run('run-a'), { ...run('run-b'), probeSetVersion: 'v1' }] }))
    expect(old.available).toBe(false)
    if (!old.available) {
      expect(old.reason).toBe('run_mismatch')
      expect(old.detail[0]).toContain('run-b')
    }
  })

  it('refuses a run with a missing, unknown, or repeated probe', () => {
    const full = run('run-b')
    const short = buildDependencyReport(input({ runs: [run('run-a'), { ...full, results: full.results.slice(1) }] }))
    expect(short.available).toBe(false)
    if (!short.available) {
      expect(short.reason).toBe('run_incomplete')
      expect(short.detail).toEqual([`run run-b: probe ${COVERAGE_PROBES[0].key} has no result`])
    }

    const stray = buildDependencyReport(input({ runs: [run('run-a'), { ...full, results: [...full.results, { probeKey: 'nope-01', domain: 'Risk', basis: 'deposit' }] }] }))
    if (stray.available) throw new Error('expected refusal')
    expect(stray.detail).toEqual(['run run-b: unknown probe nope-01'])

    const twice = buildDependencyReport(input({ runs: [run('run-a'), { ...full, results: [...full.results, full.results[0]] }] }))
    if (twice.available) throw new Error('expected refusal')
    expect(twice.detail).toEqual([`run run-b: probe ${COVERAGE_PROBES[0].key} appears twice`])
  })

  it('refuses when discarded verdicts leave a domain under the floor', () => {
    const tooMany = PROBES_PER_DOMAIN - MIN_USABLE_PROBES + 1
    const r = buildDependencyReport(input({ runs: [run('run-a'), run('run-b', {}, { Capital: tooMany })] }))
    expect(r).toEqual({
      available: false,
      reason:    'run_incomplete',
      detail:    [`run run-b: Capital has ${MIN_USABLE_PROBES - 1} usable answers`],
    })
  })
})

describe('dependency report, built', () => {
  it('keeps the two readings apart per domain and never reads a state word', () => {
    const r = buildDependencyReport(input({
      responses: responses({ Capital: 'delegated', Culture: 'shared' }),
      runs:      [run('run-a', { People: 4, Risk: 3, Capital: 6 }), run('run-b', { People: 4, Risk: 5, Capital: 6 })],
    }))
    if (!r.available) throw new Error(`refused: ${r.reason}`)

    expect(r.domains.map(d => d.domain)).toEqual(DOMAINS)
    expect(r.runIds).toEqual(['run-a', 'run-b'])
    expect(r.probeSetVersion).toBe(PROBE_SET_VERSION)
    expect(r.questionsPerDomain).toBe(PROBES_PER_DOMAIN)

    const people = r.domains.find(d => d.domain === 'People')!
    expect(people.readings).toEqual([{ deposit: 4, total: 6, errored: 0 }, { deposit: 4, total: 6, errored: 0 }])
    expect(people.readingsAgree).toBe(true)
    expect(people.silent).toBe(false)
    expect(people.countLine).toBe('4 of 6 questions got a grounded answer on both readings')
    expect(people.dependencyLabel).toBe(DEPENDENCY_REPORT_LABEL.founder)
    expect(people.role).toBeNull()

    const risk = r.domains.find(d => d.domain === 'Risk')!
    expect(risk.readingsAgree).toBe(false)
    expect(risk.countLine).toBe('3 of 6 questions got a grounded answer on one reading, 5 of 6 on the other')

    const capital = r.domains.find(d => d.domain === 'Capital')!
    expect(capital.countLine).toBe('All 6 questions got a grounded answer on both readings')
    expect(capital.role).toBe('Operations lead')

    const strategy = r.domains.find(d => d.domain === 'Strategy')!
    expect(strategy.silent).toBe(true)
    expect(strategy.countLine).toBe('None of 6 questions got a grounded answer on either reading')

    for (const d of r.domains) expect(d).not.toHaveProperty('state')
    expect(r).not.toHaveProperty('score')
  })

  it('writes a headline of counts with their denominators, both readings where they differ', () => {
    const r = buildDependencyReport(input({
      responses: responses({ Capital: 'delegated', Culture: 'shared', Strategy: 'shared' }),
      runs:      [run('run-a', { People: 4, Risk: 3, Capital: 6 }), run('run-b', { People: 4, Risk: 5, Capital: 6 })],
    }))
    if (!r.available) throw new Error('refused')
    // Founder domains: Decision-Making, People, Risk, Adversity, Succession.
    expect(r.headline).toEqual([
      '5 of 8 domains run through the founder, as the founder states it.',
      '2 more are shared with someone else.',
      'Across those 5, 7 of 30 questions got a grounded answer from the record on one reading and 9 of 30 on the other.',
      '3 of those 5 had nothing on the record on either reading: Decision-Making, Adversity, and Succession.',
    ])
  })

  it('handles the edges of the headline: all, one, and none', () => {
    const all = buildDependencyReport(input({ runs: [run('run-a', { People: 2 }), run('run-b', { People: 2 })] }))
    if (!all.available) throw new Error('refused')
    expect(all.headline[0]).toBe('All 8 domains run through the founder, as the founder states it.')
    expect(all.headline[1]).toBe('Across those 8, 2 of 48 questions got a grounded answer from the record on both readings.')

    const others = Object.fromEntries(DOMAINS.filter(d => d !== 'Risk').map(d => [d, 'delegated' as const]))
    const one = buildDependencyReport(input({ responses: responses(others) }))
    if (!one.available) throw new Error('refused')
    expect(one.headline).toEqual([
      '1 of 8 domains runs through the founder, as the founder states it.',
      'In that domain, 0 of 6 questions got a grounded answer from the record on both readings.',
      'The record had nothing there on either reading.',
    ])

    const none = buildDependencyReport(input({ responses: responses(Object.fromEntries(DOMAINS.map(d => [d, 'delegated' as const]))) }))
    if (!none.available) throw new Error('refused')
    expect(none.headline).toEqual(['None of the 8 domains runs through the founder alone, as the founder states it.'])
    expect(none.exposure).toEqual([])
  })

  it('lists exposure founder first, thinnest first by the lower reading, and leaves delegated out', () => {
    const r = buildDependencyReport(input({
      responses: responses({ Capital: 'delegated', Culture: 'shared' }),
      runs:      [
        run('run-a', { 'Decision-Making': 5, People: 1, Risk: 4, Culture: 0, Strategy: 2, Adversity: 2, Succession: 6 }),
        run('run-b', { 'Decision-Making': 5, People: 3, Risk: 1, Culture: 0, Strategy: 2, Adversity: 2, Succession: 6 }),
      ],
    }))
    if (!r.available) throw new Error('refused')
    // Lower readings: People 1, Risk 1, Strategy 2, Adversity 2, Decision-Making 5, Succession 6. Ties by domain order.
    expect(r.exposure.map(d => d.domain)).toEqual(['People', 'Risk', 'Strategy', 'Adversity', 'Decision-Making', 'Succession', 'Culture'])
  })

  it('takes discarded verdicts out of the denominator and says so', () => {
    const r = buildDependencyReport(input({ runs: [run('run-a', { Risk: 3 }, { Risk: 1 }), run('run-b', { Risk: 3 })] }))
    if (!r.available) throw new Error('refused')
    const risk = r.domains.find(d => d.domain === 'Risk')!
    expect(risk.readings[0]).toEqual({ deposit: 3, total: 5, errored: 1 })
    expect(risk.countLine).toBe('3 of 5 questions got a grounded answer on one reading, 3 of 6 on the other')
    expect(r.limits[r.limits.length - 1]).toBe('1 answer could not be checked and was left out of the counts.')

    const clean = buildDependencyReport(input())
    if (!clean.available) throw new Error('refused')
    expect(clean.limits).toHaveLength(5)
    expect(clean.limits.join(' ')).toContain(`${PROBES_PER_DOMAIN} fixed questions`)
  })

  it('ignores hysteresis: a drop from every question to none is reported as it was read', () => {
    const r = buildDependencyReport(input({ runs: [run('run-a', { Risk: 6 }), run('run-b', { Risk: 0 })] }))
    if (!r.available) throw new Error('refused')
    expect(r.domains.find(d => d.domain === 'Risk')!.readings.map(x => x.deposit)).toEqual([6, 0])
  })
})

describe('dependency report copy', () => {
  it('leads with counts', () => {
    const r = (deposit: number, total = 6) => ({ deposit, total, errored: 0 })
    expect(reportCountLine(r(4), r(4))).toBe('4 of 6 questions got a grounded answer on both readings')
    expect(reportCountLine(r(4, 5), r(4))).toBe('4 of 5 questions got a grounded answer on one reading, 4 of 6 on the other')
  })

  it('obeys the copy rules', () => {
    const built = buildDependencyReport(input({ responses: responses({ Culture: 'shared' }), runs: [run('run-a', { Risk: 3 }), run('run-b', { Risk: 4 })] }))
    if (!built.available) throw new Error('refused')
    const copy = [...allDependencyIntakeCopy(), ...allDependencyReportCopy(), ...built.headline, ...built.limits]
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI|archive)\b/i
    for (const s of copy) {
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(/%/)
      expect(s, s).not.toMatch(banned)
      expect(s, s).not.toMatch(/\bverified\b/i)
      expect(s, s).not.toMatch(/\bgrounded in\b/i)
      expect(s, s).not.toMatch(/\bcomplete\b/i)
      expect(s, s).not.toMatch(/\bscore of\b/i)
      expect(s, s).not.toMatch(/\bsuccessor will\b/i)
      // No hyphenated words in copy. The one domain name that carries a hyphen is a name.
      expect(s.replace(/Decision-Making/g, ''), s).not.toMatch(/\w-\w/)
    }
  })
})
