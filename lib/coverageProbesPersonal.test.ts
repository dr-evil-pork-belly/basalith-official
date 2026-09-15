import { describe, it, expect } from 'vitest'
import { PERSONAL_COVERAGE_PROBES, PERSONAL_PROBE_SET_VERSION } from './coverageProbesPersonal'
import { PERSONAL_DOMAINS } from './personalDomains'
import { COVERAGE_PROBES, PROBES_PER_DOMAIN } from './coverageProbes'
import { B2B_DOMAINS } from './b2bDomains'
import { ALL_COVERAGE_SETS, coverageSetForSegment, isOffLabel, segmentForTier, BUSINESS_SET, PERSONAL_SET } from './coverageSet'

describe('personal probe set p1', () => {
  it('is six probes per personal domain, keys unique, every domain in the taxonomy', () => {
    expect(PERSONAL_PROBE_SET_VERSION).toBe('p1')
    expect(PERSONAL_COVERAGE_PROBES.length).toBe(PERSONAL_DOMAINS.length * PROBES_PER_DOMAIN)
    const keys = new Set(PERSONAL_COVERAGE_PROBES.map(p => p.key))
    expect(keys.size).toBe(PERSONAL_COVERAGE_PROBES.length)
    for (const d of PERSONAL_DOMAINS) {
      expect(PERSONAL_COVERAGE_PROBES.filter(p => p.domain === d.name).length).toBe(PROBES_PER_DOMAIN)
    }
  })

  it('shares the eight slots with the business taxonomy, in the same order', () => {
    expect(PERSONAL_DOMAINS.length).toBe(B2B_DOMAINS.length)
    expect(PERSONAL_DOMAINS.map(d => d.order)).toEqual(B2B_DOMAINS.map(d => d.order))
    // Four names carry over, four are sphere-neutral renames of the business word.
    const shared = PERSONAL_DOMAINS.filter(d => B2B_DOMAINS.some(b => b.name === d.name)).map(d => d.name)
    expect(shared).toEqual(['Decision-Making', 'People', 'Risk', 'Adversity'])
    expect(PERSONAL_DOMAINS.map(d => d.name)).toEqual(['Decision-Making', 'People', 'Risk', 'Money', 'Standards', 'Direction', 'Adversity', 'Legacy'])
  })

  it('never reuses a business probe key, so results from the two sets cannot be confused', () => {
    const business = new Set(COVERAGE_PROBES.map(p => p.key))
    for (const p of PERSONAL_COVERAGE_PROBES) expect(business.has(p.key), p.key).toBe(false)
    for (const p of PERSONAL_COVERAGE_PROBES) expect(p.key.startsWith('p-'), p.key).toBe(true)
  })

  it('is position-forcing in form and names no company mechanism', () => {
    const company = /\b(customer|competitor|pricing|hire|hiring|promoted|the company|this business|the business|account|supplier)\b/i
    for (const p of PERSONAL_COVERAGE_PROBES) {
      expect(/^(Name|Say|When)\b/.test(p.question), p.key).toBe(true)
      expect(p.question, p.key).not.toMatch(company)
    }
  })

  it('obeys the copy rules as if rendered', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI)\b/
    for (const s of [...PERSONAL_COVERAGE_PROBES.map(p => p.question), ...PERSONAL_DOMAINS.map(d => d.description)]) {
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
    }
  })
})

describe('coverage set selection', () => {
  it('maps tier to segment exactly as the run always has', () => {
    expect(segmentForTier('succession')).toBe('succession')
    expect(segmentForTier('active')).toBe('b2c')
    expect(segmentForTier(null)).toBe('b2c')
    expect(segmentForTier(undefined)).toBe('b2c')
  })

  it('gives each known segment its own on-label set, and an unknown one the business set off-label', () => {
    expect(coverageSetForSegment('succession')).toBe(BUSINESS_SET)
    expect(coverageSetForSegment('b2c')).toBe(PERSONAL_SET)
    expect(isOffLabel(BUSINESS_SET, 'succession')).toBe(false)
    expect(isOffLabel(PERSONAL_SET, 'b2c')).toBe(false)
    const fallback = coverageSetForSegment('something-else')
    expect(fallback).toBe(BUSINESS_SET)
    expect(isOffLabel(fallback, 'something-else')).toBe(true)
  })

  it('has distinct versions and consistent probes and domains in every set', () => {
    const versions = new Set(ALL_COVERAGE_SETS.map(s => s.version))
    expect(versions.size).toBe(ALL_COVERAGE_SETS.length)
    for (const set of ALL_COVERAGE_SETS) {
      const names = new Set(set.domains.map(d => d.name))
      for (const p of set.probes) expect(names.has(p.domain), `${set.version} ${p.key}`).toBe(true)
      expect(set.probes.length).toBe(set.domains.length * PROBES_PER_DOMAIN)
    }
  })
})
