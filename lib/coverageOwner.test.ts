import { describe, it, expect } from 'vitest'
import { allCoverageCopy, countLine, ownerCoverageFromRows, type OwnerCoverageRow } from './coverageOwner'

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

describe('owner coverage', () => {
  it('leads with counts and shows the denominator', () => {
    expect(countLine(4, 6)).toBe('4 of 6 questions here got a grounded answer')
    expect(countLine(0, 6)).toBe('None of 6 questions here got a grounded answer')
    expect(countLine(6, 6)).toBe('All 6 questions here got a grounded answer')
    expect(countLine(0, 0)).toBe('No questions asked here yet')
  })

  it('is unavailable with no rows, and refuses an off-label run', () => {
    expect(ownerCoverageFromRows([], null)).toEqual({ available: false, reason: 'no_reading' })
    const r = ownerCoverageFromRows([row('Capital', 0)], { id: 'run-1', off_label: true, complete: true, ok: true, finished_at: 'x' })
    expect(r).toEqual({ available: false, reason: 'off_label' })
  })

  it('orders domains as the dashboard does and takes probes_total as the denominator, which already excludes errored probes', () => {
    // A domain that ran six probes and discarded one verdict is stored as
    // probes_total 5, probes_errored 1 (rollUpRun). The owner sees 4 of 5, not
    // 4 of 4 and not 4 of 6.
    const r = ownerCoverageFromRows(
      [row('Risk', 2), row('Decision-Making', 4, { probes_total: 5, probes_errored: 1 }), row('Capital', 0, { overreach: 'high' })],
      { id: 'run-1', off_label: false, complete: true, ok: true, finished_at: 'x' },
    )
    expect(r.available).toBe(true)
    if (!r.available) return
    expect(r.domains.map(d => d.domain)).toEqual(['Decision-Making', 'Risk', 'Capital'])
    expect(r.domains[0].countLine).toBe('4 of 5 questions here got a grounded answer')
    expect(r.domains[0].total).toBe(5)
    expect(r.domains[2].overreachLine).toContain('more often than not')
    expect(r.domains[0].overreachLine).toBe('Your entity stops here rather than guessing')
    expect(r.probeSet).toBe('v2')
  })

  it('never renders a score, a percentage, or grounding language it cannot back', () => {
    for (const s of allCoverageCopy()) {
      expect(s).not.toMatch(/%/)
      expect(s).not.toMatch(/\bverified\b/i)
      expect(s).not.toMatch(/\bgrounded in\b/i)
      expect(s).not.toMatch(/\bcomplete\b/i)
      expect(s).not.toMatch(/\bsuccessor will\b/i)
      expect(s).not.toMatch(/\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI)\b/)
      expect(s).not.toMatch(/[—―]/)
      expect(s).not.toMatch(/!/)
    }
  })
})
