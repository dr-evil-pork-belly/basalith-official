import { describe, it, expect } from 'vitest'
import {
  HONEYPOT_FIELD,
  botIdEnabled,
  checkBrowser,
  MAX_TRIALS_PER_HOUR,
  honeypotTripped,
  looksLikeRandomLetters,
  randomLetterSignup,
  overHourlyCeiling,
} from './botGuard'

describe('honeypotTripped', () => {
  it('is false when the field is absent, empty or whitespace', () => {
    expect(honeypotTripped(null)).toBe(false)
    expect(honeypotTripped({})).toBe(false)
    expect(honeypotTripped({ [HONEYPOT_FIELD]: '' })).toBe(false)
    expect(honeypotTripped({ [HONEYPOT_FIELD]: '   ' })).toBe(false)
    expect(honeypotTripped({ [HONEYPOT_FIELD]: null })).toBe(false)
  })

  it('is true when a script filled it', () => {
    expect(honeypotTripped({ [HONEYPOT_FIELD]: 'vUcBiDMbDxXQbyNkMeZp' })).toBe(true)
    expect(honeypotTripped({ [HONEYPOT_FIELD]: 1 })).toBe(true)
  })
})

describe('overHourlyCeiling', () => {
  it('closes at the ceiling, not after it', () => {
    expect(overHourlyCeiling(0)).toBe(false)
    expect(overHourlyCeiling(MAX_TRIALS_PER_HOUR - 1)).toBe(false)
    expect(overHourlyCeiling(MAX_TRIALS_PER_HOUR)).toBe(true)
    expect(overHourlyCeiling(3, 3)).toBe(true)
  })
})

describe('botIdEnabled', () => {
  it('is on unless TRIAL_BOTID says off', () => {
    expect(botIdEnabled({})).toBe(true)
    expect(botIdEnabled({ TRIAL_BOTID: '' })).toBe(true)
    expect(botIdEnabled({ TRIAL_BOTID: 'on' })).toBe(true)
    expect(botIdEnabled({ TRIAL_BOTID: 'off' })).toBe(false)
    expect(botIdEnabled({ TRIAL_BOTID: ' OFF ' })).toBe(false)
  })
})

describe('checkBrowser', () => {
  it('skips, and says so, when switched off, without calling the check', async () => {
    const r = await checkBrowser({ enabled: false, check: async () => { throw new Error('must not be called') } })
    expect(r).toEqual({ ok: true, skipped: true, errored: false })
  })

  it('passes a person', async () => {
    expect(await checkBrowser({ enabled: true, check: async () => ({ isBot: false }) }))
      .toEqual({ ok: true, skipped: false, errored: false })
  })

  it('refuses a bot', async () => {
    expect(await checkBrowser({ enabled: true, check: async () => ({ isBot: true }) })).toEqual({ ok: false })
  })

  it('fails open when the check throws, and reports the error', async () => {
    const seen: unknown[] = []
    const r = await checkBrowser({
      enabled: true,
      check: async () => { throw new Error('boom') },
      onError: e => { seen.push(e) },
    })
    expect(r).toEqual({ ok: true, skipped: false, errored: true })
    expect(seen).toHaveLength(1)
  })
})

describe('looksLikeRandomLetters', () => {
  // Every name and line the script sent, October 9 to 12, 2026.
  const seen = [
    'PwJfWARPVbMhfTJoRzVCv', 'vUcBiDMbDxXQbyNkMeZp',
    'rlCCJszQEAgFFcffByWB',  'oBFNSSPOHyvrDxJHiIrCZ',
    'VhLtaEHGfeGBSFhd',      'SSWrTwAPuNJkCiMwfTfvYP',
    'BZVJawgOLZfKUDsyUI',    'UriUUoCNbsYhjBWTz',
  ]

  it('catches all eight strings the script sent', () => {
    for (const s of seen) expect(looksLikeRandomLetters(s), s).toBe(true)
  })

  it('leaves real names alone', () => {
    for (const s of [
      'David Ha', 'Cher', 'McDonald', 'MacDonald', 'Wolfeschlegelstein',
      'Mary Anne Lee', 'DeShawn', 'VanDerBeek', 'Christopherson',
      'ALEXANDRA CONSTANTINE', 'alexandraconstantine', "O'Shaughnessy",
      'Nguyen Thi Minh Khai', 'JeanBaptiste', '', '   ',
    ]) expect(looksLikeRandomLetters(s), s).toBe(false)
  })

  it('is false for anything that is not a string', () => {
    expect(looksLikeRandomLetters(undefined)).toBe(false)
    expect(looksLikeRandomLetters(null)).toBe(false)
    expect(looksLikeRandomLetters(42)).toBe(false)
  })
})

describe('randomLetterSignup', () => {
  it('refuses a random name with a random or empty line', () => {
    expect(randomLetterSignup('VhLtaEHGfeGBSFhd', 'SSWrTwAPuNJkCiMwfTfvYP')).toBe(true)
    expect(randomLetterSignup('VhLtaEHGfeGBSFhd', '')).toBe(true)
    expect(randomLetterSignup('VhLtaEHGfeGBSFhd', undefined)).toBe(true)
  })

  it('never refuses a person who wrote a real line, or has a real name', () => {
    expect(randomLetterSignup('VhLtaEHGfeGBSFhd', 'My father is selling his shop')).toBe(false)
    expect(randomLetterSignup('David Ha', 'SSWrTwAPuNJkCiMwfTfvYP')).toBe(false)
    expect(randomLetterSignup('David Ha', '')).toBe(false)
  })
})
