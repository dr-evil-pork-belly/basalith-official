import { describe, it, expect } from 'vitest'
import {
  areaNeed,
  rankAreas,
  orderAreas,
  chooseOpener,
  openerKey,
  areaForSlug,
  B2C_SLUG_TO_AREA,
  WARMUP_SLUGS,
  type AreaReading,
  type Opener,
} from './questionPlanner'
import { PERSONAL_DOMAINS } from './personalDomains'
import { B2B_DOMAINS } from './b2bDomains'
import { AREA_SEEDS } from './areaSeeds'

const r = (area: string, state: AreaReading['state'], overreach: AreaReading['overreach'] = 'none', order = 0): AreaReading =>
  ({ area, state, overreach, order })

describe('areaNeed and rankAreas', () => {
  it('ranks open above partial above backed, and overreach raises an area', () => {
    expect(areaNeed(r('A', 'open'))).toBeGreaterThan(areaNeed(r('B', 'partial')))
    expect(areaNeed(r('B', 'partial'))).toBeGreaterThan(areaNeed(r('C', 'backed')))
    expect(areaNeed(r('D', 'partial', 'high'))).toBeGreaterThan(areaNeed(r('E', 'open')))
  })

  it('breaks ties on taxonomy order and moves the area asked last to the end', () => {
    const readings = [r('People', 'open', 'none', 2), r('Money', 'open', 'none', 4), r('Risk', 'backed', 'none', 3)]
    expect(rankAreas(readings, null).map(x => x.area)).toEqual(['People', 'Money', 'Risk'])
    expect(rankAreas(readings, 'People').map(x => x.area)).toEqual(['Money', 'Risk', 'People'])
  })

  it('never drops the only area, even when it was asked last', () => {
    expect(rankAreas([r('Money', 'open')], 'Money').map(x => x.area)).toEqual(['Money'])
  })
})

describe('orderAreas', () => {
  const readings = [r('People', 'open', 'none', 2), r('Money', 'partial', 'none', 4), r('Risk', 'backed', 'none', 3)]

  it('is deterministic without a random source', () => {
    expect(orderAreas(readings, null)).toEqual(['People', 'Money', 'Risk'])
  })

  it('keeps the 80/20 split: below 0.8 the neediest leads', () => {
    expect(orderAreas(readings, null, () => 0.1)[0]).toBe('People')
  })

  it('at or above 0.8 a random area other than the last one leads, and the rest follow', () => {
    const seq = [0.9, 0.99]
    const out = orderAreas(readings, 'People', () => seq.shift()!)
    expect(out[0]).not.toBe('People')
    expect([...out].sort()).toEqual(['Money', 'People', 'Risk'])
  })
})

describe('chooseOpener', () => {
  const openers: Opener[] = [
    { kind: 'incident', area: 'Capital', questionId: 'q-cap', text: 'narrative capital' },
    { kind: 'area',     area: 'Capital', questionId: null,    text: 'area capital' },
    { kind: 'incident', area: 'People',  questionId: 'q-ppl', text: 'narrative people' },
    { kind: 'area',     area: 'People',  questionId: null,    text: 'area people' },
  ]

  it('takes the neediest area\'s narrative seed when it has never run', () => {
    expect(chooseOpener(['Capital', 'People'], openers, new Map())?.text).toBe('narrative capital')
  })

  it('falls to the same area\'s area opener once the narrative seed has run', () => {
    const ran = new Map([[openerKey(openers[0]), 100]])
    expect(chooseOpener(['Capital', 'People'], openers, ran)?.text).toBe('area capital')
  })

  it('moves to the next area only when both openers in the neediest one have run', () => {
    const ran = new Map([[openerKey(openers[0]), 100], [openerKey(openers[1]), 200]])
    expect(chooseOpener(['Capital', 'People'], openers, ran)?.text).toBe('narrative people')
  })

  it('once everything has run, repeats the least recent opener in the neediest area', () => {
    const ran = new Map(openers.map((o, i) => [openerKey(o), [300, 100, 50, 60][i]]))
    expect(chooseOpener(['Capital', 'People'], openers, ran)?.text).toBe('area capital')
  })
})

describe('taxonomy agreement', () => {
  it('maps every B2C bank slug onto a personal area or onto nothing, and warm-ups onto nothing', () => {
    const areas = new Set(PERSONAL_DOMAINS.map(d => d.name))
    for (const [slug, area] of Object.entries(B2C_SLUG_TO_AREA)) {
      if (area !== null) expect(areas.has(area), `${slug} -> ${area}`).toBe(true)
    }
    for (const slug of WARMUP_SLUGS) expect(areaForSlug(slug)).toBeNull()
  })

  it('has an area opener for every area in both taxonomies, so every area can be aimed at', () => {
    expect(AREA_SEEDS.personal.map(s => s.area).sort()).toEqual(PERSONAL_DOMAINS.map(d => d.name).sort())
    expect(AREA_SEEDS.business.map(s => s.area).sort()).toEqual(B2B_DOMAINS.map(d => d.name).sort())
  })

  it('leaves Risk and Money to their openers, since no bank slug maps to them', () => {
    const mapped = new Set(Object.values(B2C_SLUG_TO_AREA))
    expect(mapped.has('Risk')).toBe(false)
    expect(mapped.has('Money')).toBe(false)
  })
})
