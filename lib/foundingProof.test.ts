import { describe, it, expect } from 'vitest'
import { REFUSAL_CANDIDATES, allProofCopy, orderGroundedCandidates, type ProofPair } from './foundingProof'
import { COVERAGE_PROBES } from './coverageProbes'

describe('founding proof candidates', () => {
  it('has refusal candidates for both scopes, all position-forcing questions', () => {
    for (const scope of ['personal', 'business'] as const) {
      expect(REFUSAL_CANDIDATES[scope].length).toBeGreaterThanOrEqual(3)
      // A question, or an imperative in the coverage-probe form ("Name the ...").
      for (const q of REFUSAL_CANDIDATES[scope]) expect(/[?.]$/.test(q.trim()) && q.length > 40).toBe(true)
    }
  })

  it('never reuses a coverage probe, because the owner sees these', () => {
    const probes = new Set(COVERAGE_PROBES.map(p => p.question.trim().toLowerCase()))
    for (const q of allProofCopy()) expect(probes.has(q.trim().toLowerCase())).toBe(false)
  })

  it('obeys the copy rules', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI)\b/i
    for (const s of allProofCopy()) {
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
    }
  })

  it('orders founding SEED pairs first, then the rest by quality', () => {
    const pairs: ProofPair[] = [
      { id: 'a', prompt: 'p1', completion: 'c1', quality_score: 90, metadata: { probe_type: 'BASIS' } },
      { id: 'b', prompt: 'p2', completion: 'c2', quality_score: 60, metadata: { probe_type: 'SEED' } },
      { id: 'c', prompt: 'p3', completion: 'c3', quality_score: 80, metadata: null },
      { id: 'd', prompt: 'p4', completion: 'c4', quality_score: 95, metadata: { probe_type: 'SEED' } },
    ]
    expect(orderGroundedCandidates(pairs).map(p => p.id)).toEqual(['d', 'b', 'a', 'c'])
  })
})
