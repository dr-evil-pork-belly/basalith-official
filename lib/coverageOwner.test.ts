import { describe, it, expect } from 'vitest'
import { allCoverageCopy, countLine, ownerCoverageFromRows, COVERAGE_CAVEAT, type OwnerCoverageRow } from './coverageOwner'
import { BUSINESS_SET, PERSONAL_SET } from './coverageSet'

function row(domain: string, deposit: number, extra: Partial<OwnerCoverageRow> = {}): OwnerCoverageRow {
  return {
    domain,
    state:             deposit === 6 ? 'backed' : deposit === 0 ? 'open' : 'partial',
    overreach:         'none',
    probes_deposit:    deposit,
    probes_total:      6,
    probes_errored:    0,
    damped:            false,
    probe_set_version: 'v2',
    last_run_id:       'run-1',
    computed_at:       '2026-09-15T04:00:00Z',
    ...extra,
  }
}

const RUN = { id: 'run-1', off_label: false, complete: true, ok: true, finished_at: 'x' }

describe('owner coverage', () => {
  it('leads with counts and shows the denominator', () => {
    expect(countLine(4, 6)).toBe('4 of 6 questions here got a grounded answer')
    expect(countLine(0, 6)).toBe('None of 6 questions here got a grounded answer')
    expect(countLine(6, 6)).toBe('All 6 questions here got a grounded answer')
    expect(countLine(0, 0)).toBe('No questions asked here yet')
  })

  it('is unavailable with no rows, and refuses an off-label run', () => {
    expect(ownerCoverageFromRows([], null)).toEqual({ available: false, reason: 'no_reading' })
    const r = ownerCoverageFromRows([row('Capital', 0)], { ...RUN, off_label: true })
    expect(r).toEqual({ available: false, reason: 'off_label' })
  })

  it('orders domains as the dashboard does and takes probes_total as the denominator, which already excludes errored probes', () => {
    // A domain that ran six probes and discarded one verdict is stored as
    // probes_total 5, probes_errored 1 (rollUpRun). The owner sees 4 of 5, not
    // 4 of 4 and not 4 of 6.
    const r = ownerCoverageFromRows(
      [row('Risk', 2), row('Decision-Making', 4, { probes_total: 5, probes_errored: 1 }), row('Capital', 0, { overreach: 'high' })],
      RUN,
    )
    expect(r.available).toBe(true)
    if (!r.available) return
    expect(r.scope).toBe('business')
    expect(r.domains.map(d => d.domain)).toEqual(['Decision-Making', 'Risk', 'Capital'])
    expect(r.domains[0].countLine).toBe('4 of 5 questions here got a grounded answer')
    expect(r.domains[0].total).toBe(5)
    expect(r.domains[2].overreachLine).toContain('more often than not')
    expect(r.domains[0].overreachLine).toBe('Your entity stops here rather than guessing')
    expect(r.probeSet).toBe('v2')
    expect(r.explainer).not.toBeNull()
    expect(r.caveat).toBe(COVERAGE_CAVEAT.business)
  })

  it('reads a personal archive through the personal set: its domains, no overreach line, no explainer, its own caveat', () => {
    const rows = [
      row('Money', 3, { probe_set_version: 'p1', overreach: 'high' }),
      row('Decision-Making', 1, { probe_set_version: 'p1', overreach: 'some' }),
      row('Legacy', 0, { probe_set_version: 'p1' }),
    ]
    const r = ownerCoverageFromRows(rows, RUN, PERSONAL_SET)
    expect(r.available).toBe(true)
    if (!r.available) return
    expect(r.scope).toBe('personal')
    expect(r.probeSet).toBe('p1')
    expect(r.domains.map(d => d.domain)).toEqual(['Decision-Making', 'Money', 'Legacy'])
    expect(r.domains[1].countLine).toBe('3 of 6 questions here got a grounded answer')
    for (const d of r.domains) expect(d.overreachLine).toBeNull()
    expect(r.explainer).toBeNull()
    expect(r.caveat).toBe(COVERAGE_CAVEAT.personal)
    expect(r.intro).toContain('at home or at work')
  })

  it('ignores rows written under the other probe set, so a stale off-label row is never shown', () => {
    // A family archive that once had a diagnostic v2 run keeps those rows in
    // archive_coverage (same archive, business domain names). Read as personal,
    // only p1 rows count; with none, the map is simply not available yet.
    const stale = [row('Capital', 2), row('Culture', 1)]
    expect(ownerCoverageFromRows(stale, RUN, PERSONAL_SET)).toEqual({ available: false, reason: 'no_reading' })
    const mixed = [...stale, row('Money', 2, { probe_set_version: 'p1' })]
    const r = ownerCoverageFromRows(mixed, RUN, PERSONAL_SET)
    expect(r.available).toBe(true)
    if (!r.available) return
    expect(r.domains.map(d => d.domain)).toEqual(['Money'])
    // And the reverse: a business read never picks up personal rows.
    const b = ownerCoverageFromRows(mixed, RUN, BUSINESS_SET)
    expect(b.available).toBe(true)
    if (!b.available) return
    expect(b.domains.map(d => d.domain)).toEqual(['Capital', 'Culture'])
  })

  it('never renders a score, a percentage, or grounding language it cannot back', () => {
    for (const s of allCoverageCopy()) {
      expect(s).not.toMatch(/%/)
      expect(s).not.toMatch(/\bverified\b/i)
      expect(s).not.toMatch(/\bgrounded in\b/i)
      expect(s).not.toMatch(/\bcomplete\b/i)
      expect(s).not.toMatch(/\bsuccessor will\b/i)
      expect(s).not.toMatch(/\bfamily will\b/i)
      expect(s).not.toMatch(/\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI)\b/)
      expect(s).not.toMatch(/[—―]/)
      expect(s).not.toMatch(/!/)
    }
  })

  it('does not claim, on a personal archive, that overreach is caught, because the family route runs no verifier', () => {
    expect(COVERAGE_CAVEAT.personal).not.toMatch(/caught/i)
    expect(COVERAGE_CAVEAT.personal).toMatch(/not of a conversation/)
  })
})
