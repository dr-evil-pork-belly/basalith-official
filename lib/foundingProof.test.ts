import { describe, it, expect } from 'vitest'
import { canShowProof } from './foundingSequence'
import { REFUSAL_CANDIDATES, allProofCopy, orderGroundedCandidates, type ProofPair } from './foundingProof'
import { ALL_COVERAGE_SETS } from './coverageSet'

describe('founding proof candidates', () => {
  it('has refusal candidates for both scopes, all position-forcing questions', () => {
    for (const scope of ['personal', 'business'] as const) {
      expect(REFUSAL_CANDIDATES[scope].length).toBeGreaterThanOrEqual(3)
      // A question, or an imperative in the coverage-probe form ("Name the ...").
      for (const q of REFUSAL_CANDIDATES[scope]) expect(/[?.]$/.test(q.trim()) && q.length > 40).toBe(true)
    }
  })

  it('never reuses a coverage probe from any set, because the owner sees these', () => {
    const probes = new Set(ALL_COVERAGE_SETS.flatMap(s => s.probes.map(p => p.question.trim().toLowerCase())))
    expect(probes.size).toBeGreaterThan(48)
    for (const q of allProofCopy()) expect(probes.has(q.trim().toLowerCase()), q).toBe(false)
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

describe('the route gate, canShowProof', () => {
  // The proof route used to require status.done (all three calls). Since
  // September 17, 2026 it requires one completed call, because the proof
  // needs one included pair and call 1 produces ten to fifteen (recon C2).
  it('opens after call 1 and stays open through call 3', () => {
    const status = (completed: number) => ({ completed, done: completed >= 3 })
    expect(canShowProof(status(0))).toBe(false)
    expect(canShowProof(status(1))).toBe(true)
    expect(canShowProof(status(2))).toBe(true)
    expect(canShowProof(status(3))).toBe(true)
  })
})
