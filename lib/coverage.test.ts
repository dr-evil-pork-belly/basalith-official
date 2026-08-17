import { describe, it, expect } from 'vitest'
import {
  rollUpDomainState,
  rollUpOverreach,
  applyHysteresis,
  rollUpRun,
  coverageStateLabel,
  overreachLabel,
  OVERREACH_EXPLAINER,
  expectedProbeCount,
  isRunComplete,
  domainStateDrift,
  depositSpread,
  type ProbeResult,
  type CoverageState,
  type OverreachLevel,
} from './coverage'
import { B2B_DOMAINS } from './b2bDomains'
import { COVERAGE_PROBES, PROBES_PER_DOMAIN, PROBE_SET_VERSION, probesForDomain } from './coverageProbes'
import type { GroundingBasis } from './verifyGrounding'

const D = (n: number) => B2B_DOMAINS[n].name

function results(domain: string, ...bases: GroundingBasis[]): ProbeResult[] {
  return bases.map((basis, i) => ({ probeKey: `${domain}-${i}`, domain, basis }))
}

describe('rollUpDomainState', () => {
  it('is backed only when every probe landed on a deposit', () => {
    expect(rollUpDomainState(['deposit', 'deposit', 'deposit'])).toBe('backed')
  })

  it('is open when no probe landed on a deposit', () => {
    expect(rollUpDomainState(['no_position', 'no_position', 'unsupported'])).toBe('open')
  })

  it('is partial on a mix', () => {
    expect(rollUpDomainState(['deposit', 'no_position', 'unsupported'])).toBe('partial')
    expect(rollUpDomainState(['deposit', 'deposit', 'unsupported'])).toBe('partial')
  })

  // Still correct, and deliberately kept. For the COVERAGE dimension neither
  // basis backs a claim, so they are equivalent here. The difference between
  // them is real and is carried by rollUpOverreach instead, which is the fix for
  // v1 having thrown the distinction away entirely.
  it('treats no_position and unsupported identically, because neither backs coverage', () => {
    expect(rollUpDomainState(['no_position', 'no_position'])).toBe(
      rollUpDomainState(['unsupported', 'unsupported']),
    )
  })

  it('is open on an empty domain rather than throwing', () => {
    expect(rollUpDomainState([])).toBe('open')
  })
})

describe('rollUpOverreach', () => {
  it('is none when every probe landed on a deposit, since the question does not arise', () => {
    expect(rollUpOverreach(['deposit', 'deposit'])).toBe('none')
  })

  it('is none when the entity declined on all its ungrounded probes', () => {
    expect(rollUpOverreach(['deposit', 'no_position', 'no_position'])).toBe('none')
  })

  it('is high when a majority of the ungrounded probes overreached', () => {
    expect(rollUpOverreach(['unsupported', 'unsupported', 'no_position'])).toBe('high')
    expect(rollUpOverreach(['unsupported'])).toBe('high')
  })

  it('is some on a minority', () => {
    expect(rollUpOverreach(['unsupported', 'no_position', 'no_position'])).toBe('some')
  })

  it('is not diluted by grounded probes, because it reads the ungrounded ones only', () => {
    // Two ungrounded probes, both overreaching. Adding deposits must not soften
    // that to 'some' by counting them in the denominator.
    expect(rollUpOverreach(['deposit', 'deposit', 'deposit', 'unsupported', 'unsupported'])).toBe('high')
  })

  it('distinguishes the two open domains v1 could not tell apart', () => {
    const quietGap  = rollUpOverreach(['no_position', 'no_position', 'no_position'])
    const noisyGap  = rollUpOverreach(['unsupported', 'unsupported', 'unsupported'])
    expect(rollUpDomainState(['no_position', 'no_position', 'no_position'])).toBe('open')
    expect(rollUpDomainState(['unsupported', 'unsupported', 'unsupported'])).toBe('open')
    expect(quietGap).toBe('none')
    expect(noisyGap).toBe('high')
    expect(quietGap).not.toBe(noisyGap)
  })

  it('is none on an empty domain', () => {
    expect(rollUpOverreach([])).toBe('none')
  })
})

describe('applyHysteresis', () => {
  it('takes the raw state on a first run', () => {
    expect(applyHysteresis(null, 'open')).toBe('open')
    expect(applyHysteresis(null, 'backed')).toBe('backed')
  })

  it('damps the backed to open fall to partial', () => {
    expect(applyHysteresis('backed', 'open')).toBe('partial')
  })

  it('lets a second consecutive weak run reach open', () => {
    const first  = applyHysteresis('backed', 'open')
    const second = applyHysteresis(first, 'open')
    expect(first).toBe('partial')
    expect(second).toBe('open')
  })

  it('applies upward moves immediately', () => {
    expect(applyHysteresis('open', 'backed')).toBe('backed')
    expect(applyHysteresis('partial', 'backed')).toBe('backed')
  })

  it('does not damp single-step falls', () => {
    expect(applyHysteresis('backed', 'partial')).toBe('partial')
    expect(applyHysteresis('partial', 'open')).toBe('open')
  })
})

describe('rollUpRun', () => {
  it('returns one row per live domain even when the run produced nothing', () => {
    const rows = rollUpRun([])
    expect(rows).toHaveLength(B2B_DOMAINS.length)
    expect(rows.every(r => r.state === 'open')).toBe(true)
    expect(rows.every(r => r.probesTotal === 0)).toBe(true)
  })

  it('does not mutate the results passed in (purity)', () => {
    const rs     = results(D(0), 'deposit', 'deposit', 'deposit')
    const before = JSON.stringify(rs)
    rollUpRun(rs)
    expect(JSON.stringify(rs)).toBe(before)
  })

  it('counts all three bases separately per domain', () => {
    const rows = rollUpRun(results(D(0), 'deposit', 'no_position', 'unsupported', 'unsupported'))
    const hit  = rows.find(r => r.domain === D(0))!
    expect(hit.state).toBe('partial')
    expect(hit.probesDeposit).toBe(1)
    expect(hit.probesDeclined).toBe(1)
    expect(hit.probesOverreach).toBe(2)
    expect(hit.probesTotal).toBe(4)
    expect(hit.overreach).toBe('high')
  })

  it('leaves untouched domains open with no overreach', () => {
    const rows  = rollUpRun(results(D(0), 'deposit'))
    const other = rows.filter(r => r.domain !== D(0))
    expect(other.every(r => r.state === 'open')).toBe(true)
    expect(other.every(r => r.overreach === 'none')).toBe(true)
  })

  it('flags a damped domain so the map can be audited', () => {
    const previous: Record<string, CoverageState> = { [D(0)]: 'backed' }
    const rows = rollUpRun(results(D(0), 'no_position', 'no_position', 'no_position'), previous)
    const hit  = rows.find(r => r.domain === D(0))!
    expect(hit.state).toBe('partial')
    expect(hit.damped).toBe(true)
    expect(hit.probesDeposit).toBe(0)
  })

  it('does not flag damped when the raw state stands', () => {
    const rows = rollUpRun(results(D(0), 'deposit', 'deposit', 'deposit'))
    expect(rows.find(r => r.domain === D(0))!.damped).toBe(false)
  })

  it('ignores results naming a domain that is not live', () => {
    const rows = rollUpRun(results('Not A Live Domain', 'deposit', 'deposit', 'deposit'))
    expect(rows).toHaveLength(B2B_DOMAINS.length)
    expect(rows.every(r => r.state === 'open')).toBe(true)
  })
})

describe('discarded verifier failures', () => {
  const errored = (domain: string, n: number): ProbeResult[] =>
    Array.from({ length: n }, (_, i) => ({
      probeKey: `${domain}-err-${i}`, domain, basis: 'unsupported' as GroundingBasis, verifierErrored: true,
    }))

  it('does not count a discarded verdict as overreach', () => {
    // The whole point. verifyGrounding fails safe to 'unsupported', which is
    // right for production and would otherwise record a parse error as the
    // entity reaching past the archive.
    const rows = rollUpRun([...results(D(0), 'deposit', 'no_position'), ...errored(D(0), 2)])
    const hit  = rows.find(r => r.domain === D(0))!
    expect(hit.probesOverreach).toBe(0)
    expect(hit.overreach).toBe('none')
    expect(hit.probesErrored).toBe(2)
  })

  it('does not count a discarded verdict against coverage either', () => {
    const clean   = rollUpRun(results(D(0), 'deposit', 'deposit'))
    const dirtied = rollUpRun([...results(D(0), 'deposit', 'deposit'), ...errored(D(0), 3)])
    expect(clean.find(r => r.domain === D(0))!.state).toBe('backed')
    expect(dirtied.find(r => r.domain === D(0))!.state).toBe('backed')
  })

  it('excludes discarded verdicts from probesTotal, so a short run reads as short', () => {
    const rows = rollUpRun([...results(D(0), 'deposit'), ...errored(D(0), 2)])
    const hit  = rows.find(r => r.domain === D(0))!
    expect(hit.probesTotal).toBe(1)
    expect(isRunComplete(rows)).toBe(false)
  })

  it('reads a domain of nothing but failures as open, not as overreach', () => {
    const hit = rollUpRun(errored(D(0), 6)).find(r => r.domain === D(0))!
    expect(hit.state).toBe('open')
    expect(hit.overreach).toBe('none')
    expect(hit.probesErrored).toBe(6)
  })
})

describe('depositSpread', () => {
  it('is zero when every domain reads the same', () => {
    const all = B2B_DOMAINS.flatMap(d => results(d.name, 'deposit', 'no_position'))
    expect(depositSpread(rollUpRun(all))).toBe(0)
  })

  it('measures the gap between the best and worst covered domain', () => {
    const rows = rollUpRun([
      ...results(D(0), 'deposit', 'deposit', 'deposit'),
      ...results(D(1), 'no_position', 'no_position', 'no_position'),
    ])
    expect(depositSpread(rows)).toBe(3)
  })

  // The property the gate needs: spread is about discrimination, so it must not
  // depend on where the backed/partial/open thresholds happen to sit.
  it('is nonzero on a map where every domain reads partial', () => {
    const rows = rollUpRun([
      ...results(D(0), 'deposit', 'deposit', 'no_position'),
      ...results(D(1), 'deposit', 'no_position', 'no_position'),
    ])
    expect(rows.find(r => r.domain === D(0))!.state).toBe('partial')
    expect(rows.find(r => r.domain === D(1))!.state).toBe('partial')
    expect(depositSpread(rows)).toBe(2)
  })

  it('is zero on an empty map rather than throwing', () => {
    expect(depositSpread([])).toBe(0)
    expect(depositSpread(rollUpRun([]))).toBe(0)
  })
})

describe('domainStateDrift', () => {
  it('is empty when two runs agree', () => {
    const a = rollUpRun(results(D(0), 'deposit'))
    const b = rollUpRun(results(D(0), 'deposit'))
    expect(domainStateDrift(a, b)).toEqual([])
  })

  it('names only the domains whose state moved', () => {
    const a = rollUpRun(results(D(0), 'deposit'))
    const b = rollUpRun(results(D(0), 'no_position'))
    expect(domainStateDrift(a, b)).toEqual([D(0)])
  })

  it('does not report a domain whose counts moved but whose state held', () => {
    const a = rollUpRun(results(D(0), 'deposit', 'no_position', 'no_position'))
    const b = rollUpRun(results(D(0), 'deposit', 'deposit', 'unsupported'))
    expect(a.find(r => r.domain === D(0))!.state).toBe('partial')
    expect(b.find(r => r.domain === D(0))!.state).toBe('partial')
    expect(domainStateDrift(a, b)).toEqual([])
  })
})

describe('the probe set', () => {
  it('is v2, six per live domain', () => {
    expect(PROBE_SET_VERSION).toBe('v2')
    expect(PROBES_PER_DOMAIN).toBe(6)
    for (const d of B2B_DOMAINS) {
      expect(probesForDomain(d.name)).toHaveLength(PROBES_PER_DOMAIN)
    }
    expect(expectedProbeCount()).toBe(B2B_DOMAINS.length * PROBES_PER_DOMAIN)
  })

  it('has unique probe keys, because the key is the Inngest step id', () => {
    const keys = COVERAGE_PROBES.map(p => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('carries no em dashes in probe copy', () => {
    expect(COVERAGE_PROBES.filter(p => p.question.includes('—')).map(p => p.key)).toEqual([])
  })

  // The v1 failure was scenario-locked probes that asked about situations the
  // founder never faced, so no deposit could ever back them. The own-ground form
  // asks the founder to name their own rule. It is not fully checkable by a
  // string test, but the tell of the broken form is a probe that hands the
  // founder a hypothetical to choose inside of.
  it('does not hand the founder an invented scenario to choose inside of', () => {
    const scenarioTell = /\b(two candidates|equal on paper|you have one week|thirty percent|one unit of|even odds)\b/i
    expect(COVERAGE_PROBES.filter(p => scenarioTell.test(p.question)).map(p => p.key)).toEqual([])
  })

  it('asks every probe to name or say something specific, which is what forces a position', () => {
    const forcing = /\b(name|say|state|commit)\b/i
    expect(COVERAGE_PROBES.filter(p => !forcing.test(p.question)).map(p => p.key)).toEqual([])
  })
})

describe('rendered labels', () => {
  it('never claim completeness, verification, or a percentage', () => {
    const banned = /complete|verified|grounded in|%|percent/i
    for (const s of ['backed', 'partial', 'open'] as CoverageState[]) {
      expect(coverageStateLabel(s)).not.toMatch(banned)
      for (const o of ['none', 'some', 'high'] as OverreachLevel[]) {
        const label = overreachLabel(s, o)
        if (label) expect(label).not.toMatch(banned)
      }
    }
    expect(OVERREACH_EXPLAINER).not.toMatch(banned)
  })

  it('carry no em dashes', () => {
    for (const s of ['backed', 'partial', 'open'] as CoverageState[]) {
      expect(coverageStateLabel(s)).not.toContain('—')
      for (const o of ['none', 'some', 'high'] as OverreachLevel[]) {
        expect(overreachLabel(s, o) ?? '').not.toContain('—')
      }
    }
    expect(OVERREACH_EXPLAINER).not.toContain('—')
  })

  it('say nothing about overreach on a backed domain, where the question does not arise', () => {
    for (const o of ['none', 'some', 'high'] as OverreachLevel[]) {
      expect(overreachLabel('backed', o)).toBeNull()
    }
  })

  // The integrity line on this dimension. A successor never receives an
  // overreaching draft; the verifier replaces it. No label may imply otherwise.
  it('never claim a successor is shown an invented answer', () => {
    const implies = /\b(tells? (them|the successor)|shows?|gives? them|answers? anyway|makes? (it )?up|invent(s|ed)?|fabricat)/i
    for (const s of ['partial', 'open'] as CoverageState[]) {
      for (const o of ['none', 'some', 'high'] as OverreachLevel[]) {
        expect(overreachLabel(s, o)!).not.toMatch(implies)
      }
    }
  })

  it('explain what actually reaches the successor', () => {
    expect(OVERREACH_EXPLAINER).toMatch(/caught before a successor sees it/i)
  })
})

describe('isRunComplete', () => {
  it('is false when any domain came up short of its probe set', () => {
    expect(isRunComplete(rollUpRun(results(D(0), 'deposit', 'deposit')))).toBe(false)
  })

  it('is true when every domain got its full set', () => {
    const full = Array.from({ length: PROBES_PER_DOMAIN }, () => 'deposit' as GroundingBasis)
    const all  = B2B_DOMAINS.flatMap(d => results(d.name, ...full))
    expect(isRunComplete(rollUpRun(all))).toBe(true)
  })
})
