import { describe, it, expect } from 'vitest'
import { AREA_SEEDS, areasFor, seedForArea, allAreaCallCopy } from './areaCalls'
import { ALL_COVERAGE_SETS } from './coverageSet'
import { FOUNDING_SEEDS } from './foundingSequence'

describe('area call seeds', () => {
  it('has exactly one seed per area of each taxonomy', () => {
    for (const scope of ['personal', 'business'] as const) {
      const areas = areasFor(scope)
      expect(AREA_SEEDS[scope].map(s => s.area)).toEqual(areas)
      for (const a of areas) expect(seedForArea(scope, a)?.area).toBe(a)
    }
    expect(seedForArea('personal', 'Capital')).toBeNull()
    expect(seedForArea('business', 'Money')).toBeNull()
  })

  it('is incident-anchored: every seed asks for a moment, and none repeats a coverage probe or a founding opener', () => {
    const probes = new Set(ALL_COVERAGE_SETS.flatMap(s => s.probes.map(p => p.question.trim().toLowerCase())))
    const openers = new Set([...FOUNDING_SEEDS.personal, ...FOUNDING_SEEDS.business].map(s => s.question.trim().toLowerCase()))
    for (const q of allAreaCallCopy()) {
      expect(q.startsWith('Tell me about'), q).toBe(true)
      expect(q.trim().endsWith('?') || q.trim().endsWith('.'), q).toBe(true)
      expect(probes.has(q.trim().toLowerCase()), q).toBe(false)
      expect(openers.has(q.trim().toLowerCase()), q).toBe(false)
    }
  })

  it('obeys the copy rules', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI)\b/
    for (const s of allAreaCallCopy()) {
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
    }
  })
})
