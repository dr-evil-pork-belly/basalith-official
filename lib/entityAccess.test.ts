import { describe, it, expect } from 'vitest'
import {
  hasEntityAccess,
  holders,
  grantAccess,
  revokeAccess,
  pruneAccess,
  accessBlock,
  contributorTokenFrom,
  normalizeMode,
  normalizeIds,
  MAX_ENTITY_ACCESS,
  type EntityAccessState,
} from './entityAccess'

const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'aaaaaaaa-0000-4000-8000-000000000002'
const C = 'aaaaaaaa-0000-4000-8000-000000000003'
const NONE: EntityAccessState = { mode: 'none', ids: [] }

describe('who may ask a Basalith', () => {
  it('none answers nobody, even an id left on the list', () => {
    expect(hasEntityAccess(NONE, A)).toBe(false)
    expect(hasEntityAccess({ mode: 'none', ids: [A] }, A)).toBe(false)
  })

  it('preview answers the listed contributors and nobody else', () => {
    const s: EntityAccessState = { mode: 'preview', ids: [A] }
    expect(hasEntityAccess(s, A)).toBe(true)
    // The case the route missed before October 6, 2026.
    expect(hasEntityAccess(s, B)).toBe(false)
    expect(hasEntityAccess(s, null)).toBe(false)
    expect(hasEntityAccess(s, '')).toBe(false)
  })

  it('open answers every contributor', () => {
    expect(hasEntityAccess({ mode: 'open', ids: [] }, B)).toBe(true)
  })

  it('reads unknown values as closed', () => {
    expect(normalizeMode('everyone')).toBe('none')
    expect(normalizeMode(null)).toBe('none')
    expect(normalizeMode('preview')).toBe('preview')
    expect(normalizeIds(null)).toEqual([])
    expect(normalizeIds([A, A, 7, '', B])).toEqual([A, B])
  })
})

describe('grant', () => {
  it('opens it to one person from none', () => {
    const r = grantAccess(NONE, A, [A, B])
    expect(r).toEqual({ next: { mode: 'preview', ids: [A] }, changed: true })
  })

  it('adds to the list and is a no op the second time', () => {
    const once = grantAccess({ mode: 'preview', ids: [A] }, B, [A, B])
    expect(once.next).toEqual({ mode: 'preview', ids: [A, B] })
    expect(once.changed).toBe(true)
    const twice = grantAccess(once.next, B, [A, B])
    expect(twice.changed).toBe(false)
    expect(twice.next).toEqual(once.next)
  })

  it('refuses someone who is not an active contributor of this Basalith', () => {
    const r = grantAccess(NONE, C, [A, B])
    expect(r.changed).toBe(false)
    expect(r.refused).toBe('not_active')
    expect(r.next).toEqual(NONE)
  })

  it('drops removed contributors from the list while granting', () => {
    const r = grantAccess({ mode: 'preview', ids: [A, C] }, B, [A, B])
    expect(r.next).toEqual({ mode: 'preview', ids: [A, B] })
  })

  it('leaves an open row alone', () => {
    const open: EntityAccessState = { mode: 'open', ids: [] }
    expect(grantAccess(open, A, [A])).toEqual({ next: open, changed: false })
  })

  it('refuses past the cap', () => {
    const ids = Array.from({ length: MAX_ENTITY_ACCESS }, (_, i) => `id-${i}`)
    const r = grantAccess({ mode: 'preview', ids }, A, [...ids, A])
    expect(r.refused).toBe('full')
    expect(r.changed).toBe(false)
    expect(r.next.ids).toHaveLength(MAX_ENTITY_ACCESS)
  })
})

describe('revoke', () => {
  it('closes it to one person and keeps the rest', () => {
    const r = revokeAccess({ mode: 'preview', ids: [A, B] }, A, [A, B])
    expect(r).toEqual({ next: { mode: 'preview', ids: [B] }, changed: true })
  })

  it('an empty list becomes none', () => {
    const r = revokeAccess({ mode: 'preview', ids: [A] }, A, [A, B])
    expect(r).toEqual({ next: NONE, changed: true })
  })

  it('from open, closing one person never closes the others', () => {
    const r = revokeAccess({ mode: 'open', ids: [] }, A, [A, B, C])
    expect(r.next).toEqual({ mode: 'preview', ids: [B, C] })
    expect(hasEntityAccess(r.next, A)).toBe(false)
    expect(hasEntityAccess(r.next, B)).toBe(true)
  })

  it('is a no op for someone who had no access', () => {
    const s: EntityAccessState = { mode: 'preview', ids: [A] }
    expect(revokeAccess(s, B, [A, B])).toEqual({ next: s, changed: false })
    expect(revokeAccess(NONE, A, [A])).toEqual({ next: NONE, changed: false })
  })
})

describe('removing a contributor', () => {
  it('takes their access with them, so adding them back does not restore it', () => {
    const r = pruneAccess({ mode: 'preview', ids: [A, B] }, A)
    expect(r).toEqual({ next: { mode: 'preview', ids: [B] }, changed: true })
    expect(pruneAccess({ mode: 'preview', ids: [A] }, A).next).toEqual(NONE)
  })

  it('touches nothing otherwise', () => {
    const open: EntityAccessState = { mode: 'open', ids: [] }
    expect(pruneAccess(open, A)).toEqual({ next: open, changed: false })
    expect(pruneAccess(NONE, A).changed).toBe(false)
  })
})

describe('holders', () => {
  it('counts only active contributors', () => {
    expect(holders({ mode: 'preview', ids: [A, C] }, [A, B])).toEqual([A])
    expect(holders({ mode: 'open', ids: [] }, [A, B])).toEqual([A, B])
    expect(holders(NONE, [A])).toEqual([])
  })
})

describe('where the control is offered', () => {
  it('only on an active, personal Basalith on the grounded path', () => {
    expect(accessBlock({ status: 'active', tier: 'estate', pipeline: 'grounded' })).toBeNull()
    expect(accessBlock({ status: 'trial', tier: 'estate', pipeline: 'grounded' })).toBe('not_active')
    expect(accessBlock({ status: 'active', tier: 'succession', pipeline: 'grounded' })).toBe('succession')
    expect(accessBlock({ status: 'active', tier: 'estate', pipeline: 'context' })).toBe('pipeline')
    expect(accessBlock({ status: 'active', tier: null, pipeline: null })).toBe('pipeline')
    expect(accessBlock({})).toBe('not_active')
  })
})

describe('the contributor token on a request', () => {
  const HEX = 'a'.repeat(64)
  const JWT = `${'x'.repeat(20)}.${'y'.repeat(40)}.${'z'.repeat(20)}`

  it('reads the bearer header or the body', () => {
    expect(contributorTokenFrom(`Bearer ${HEX}`, undefined)).toBe(HEX)
    expect(contributorTokenFrom(`bearer   ${HEX}`, undefined)).toBe(HEX)
    expect(contributorTokenFrom(null, HEX)).toBe(HEX)
  })

  it('never mistakes an owner session token for one', () => {
    expect(contributorTokenFrom(`Bearer ${JWT}`, undefined)).toBeNull()
    // An owner JWT in the header with a contributor token in the body: the body token is used.
    expect(contributorTokenFrom(`Bearer ${JWT}`, HEX)).toBe(HEX)
  })

  it('refuses short, odd, or missing values', () => {
    expect(contributorTokenFrom(null, undefined)).toBeNull()
    expect(contributorTokenFrom('Bearer short', undefined)).toBeNull()
    expect(contributorTokenFrom(HEX, undefined)).toBeNull()
    expect(contributorTokenFrom(null, 12345)).toBeNull()
    expect(contributorTokenFrom(null, `${'a'.repeat(40)} or 1=1`)).toBeNull()
  })
})
