import { describe, it, expect } from 'vitest'
import { TRIAL_DAYS, canShowProof, deriveFamilyName, isTrial, trialWindow } from './trial'

describe('deriveFamilyName', () => {
  it('takes the last token of a two-token name', () => {
    expect(deriveFamilyName('David Ha')).toBe('Ha')
    expect(deriveFamilyName('  mary anne  lee ')).toBe('Lee')
  })

  it('uses the whole name when it is one token', () => {
    expect(deriveFamilyName('Cher')).toBe('Cher')
    expect(deriveFamilyName('  ha ')).toBe('Ha')
  })

  it('falls back to Founder on an empty name', () => {
    expect(deriveFamilyName('')).toBe('Founder')
    expect(deriveFamilyName('   ')).toBe('Founder')
  })
})

describe('trialWindow', () => {
  it('expires exactly TRIAL_DAYS after it starts', () => {
    const now = new Date('2026-09-17T20:00:00.000Z')
    const w = trialWindow(now)
    expect(TRIAL_DAYS).toBe(30)
    expect(w.startedAt).toBe('2026-09-17T20:00:00.000Z')
    expect(w.expiresAt).toBe('2026-10-17T20:00:00.000Z')
    expect(new Date(w.expiresAt).getTime() - new Date(w.startedAt).getTime()).toBe(30 * 24 * 60 * 60 * 1000)
  })
})

describe('isTrial', () => {
  it('is true only for status trial', () => {
    expect(isTrial({ status: 'trial' })).toBe(true)
    expect(isTrial({ status: 'active' })).toBe(false)
    expect(isTrial({ status: null })).toBe(false)
    expect(isTrial({})).toBe(false)
  })
})

describe('canShowProof', () => {
  it('needs one completed call, not three', () => {
    expect(canShowProof({ completed: 0 })).toBe(false)
    expect(canShowProof({ completed: 1 })).toBe(true)
    expect(canShowProof({ completed: 3 })).toBe(true)
  })
})
