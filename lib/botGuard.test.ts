import { describe, it, expect } from 'vitest'
import {
  HONEYPOT_FIELD,
  MAX_TRIALS_PER_HOUR,
  TURNSTILE_VERIFY_URL,
  honeypotTripped,
  looksLikeRandomLetters,
  randomLetterSignup,
  overHourlyCeiling,
  turnstileSecret,
  verifyTurnstile,
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

describe('turnstileSecret', () => {
  it('is null when unset or blank', () => {
    expect(turnstileSecret({})).toBeNull()
    expect(turnstileSecret({ TURNSTILE_SECRET_KEY: '  ' })).toBeNull()
    expect(turnstileSecret({ TURNSTILE_SECRET_KEY: ' abc ' })).toBe('abc')
  })
})

describe('verifyTurnstile', () => {
  const never = async () => { throw new Error('fetch must not be called') }

  it('skips, and says so, when no secret is configured', async () => {
    expect(await verifyTurnstile(undefined, '1.2.3.4', { secret: null, fetchImpl: never })).toEqual({ ok: true, skipped: true })
  })

  it('refuses a missing token without calling Cloudflare', async () => {
    for (const t of [undefined, null, '', '   ', 42, 'x'.repeat(2049)]) {
      expect(await verifyTurnstile(t, '1.2.3.4', { secret: 's', fetchImpl: never })).toEqual({ ok: false, reason: 'missing-token', codes: [] })
    }
  })

  it('passes a token Cloudflare accepts, and sends secret, response and ip', async () => {
    let seen: { url: string; body: URLSearchParams } | null = null
    const r = await verifyTurnstile('tok', '1.2.3.4', {
      secret: 's',
      fetchImpl: async (url, init) => {
        seen = { url, body: init.body }
        return { ok: true, status: 200, json: async () => ({ success: true }) }
      },
    })
    expect(r).toEqual({ ok: true, skipped: false })
    expect(seen!.url).toBe(TURNSTILE_VERIFY_URL)
    expect(seen!.body.get('secret')).toBe('s')
    expect(seen!.body.get('response')).toBe('tok')
    expect(seen!.body.get('remoteip')).toBe('1.2.3.4')
  })

  it('leaves the ip out when it is unknown', async () => {
    let body: URLSearchParams | null = null
    await verifyTurnstile('tok', 'unknown', {
      secret: 's',
      fetchImpl: async (_url, init) => { body = init.body; return { ok: true, status: 200, json: async () => ({ success: true }) } },
    })
    expect(body!.has('remoteip')).toBe(false)
  })

  it('refuses a token Cloudflare rejects and carries the codes', async () => {
    const r = await verifyTurnstile('tok', null, {
      secret: 's',
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }) }),
    })
    expect(r).toEqual({ ok: false, reason: 'rejected', codes: ['timeout-or-duplicate'] })
  })

  it('fails closed when Cloudflare errors or cannot be reached', async () => {
    const http = await verifyTurnstile('tok', null, {
      secret: 's',
      fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
    })
    expect(http).toEqual({ ok: false, reason: 'unreachable', codes: ['http-503'] })

    const thrown = await verifyTurnstile('tok', null, {
      secret: 's',
      fetchImpl: async () => { throw new TypeError('network') },
    })
    expect(thrown).toEqual({ ok: false, reason: 'unreachable', codes: ['TypeError'] })
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
