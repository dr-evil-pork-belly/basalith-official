import { describe, it, expect } from 'vitest'
import {
  isDeposit,
  sanitizeHistory,
  priorQuestions,
  ownerOnly,
  depositIdsBehind,
  gapLanguage,
  OWNER_PAIR_SOURCES,
  DEPOSIT_BACKED_SOURCES,
} from './familyEntity'
import { groundingGapReply, GAP_REPLY_BY_LANGUAGE, normalizeGapLanguage } from './verifyGrounding'

describe('family entity helpers', () => {
  it('keeps the statement heuristic the route always had', () => {
    expect(isDeposit('What did I believe about hard work?')).toBe(false)
    expect(isDeposit('How do you handle money')).toBe(false)
    expect(isDeposit('short')).toBe(false)
    expect(isDeposit('I always told the kids that a promise is a promise, even a small one.')).toBe(true)
  })

  it('sanitizes history to user and assistant string turns only', () => {
    const raw = [
      { role: 'user', content: 'first' },
      { role: 'entity', content: 'dropped, wrong role' },
      { role: 'assistant', content: 'second' },
      { role: 'user', content: '   ' },
      { role: 'user', content: { text: 'dropped, not a string' } },
      null,
      'dropped',
    ]
    expect(sanitizeHistory(raw)).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
    ])
    expect(sanitizeHistory(undefined)).toEqual([])
    expect(priorQuestions(sanitizeHistory(raw))).toEqual(['first'])
  })

  it('keeps only pairs in the owner\'s own voice, so the prompt and the verifier see the same material', () => {
    const pairs = [
      { id: '1', prompt: 'p', completion: 'c', source_type: 'deposit',     source_id: 'd1' },
      { id: '2', prompt: 'p', completion: 'c', source_type: 'contributor', source_id: null },
      { id: '3', prompt: 'p', completion: 'c', source_type: 'voice',       source_id: 'v1' },
      { id: '4', prompt: 'p', completion: 'c', source_type: 'label',       source_id: null },
      { id: '5', prompt: 'p', completion: 'c', source_type: 'owner',       source_id: 'd2' },
      { id: '6', prompt: 'p', completion: 'c', source_type: 'companion',   source_id: 'd3' },
    ]
    expect(ownerOnly(pairs).map(p => p.id)).toEqual(['1', '3', '5', '6'])
    expect([...OWNER_PAIR_SOURCES]).not.toContain('contributor')
    expect([...OWNER_PAIR_SOURCES]).not.toContain('label')
    // Usage tracking follows only the deposit-backed sources; a voice pair's source_id is a recording.
    expect(depositIdsBehind(pairs)).toEqual(['d1', 'd2', 'd3'])
    for (const s of DEPOSIT_BACKED_SOURCES) expect([...OWNER_PAIR_SOURCES]).toContain(s)
  })

  it('picks the reader\'s language first, then the archive\'s, then English', () => {
    expect(gapLanguage('vi', 'en')).toBe('vi')
    expect(gapLanguage(null, 'zh')).toBe('zh')
    expect(gapLanguage(undefined, undefined)).toBe('en')
    expect(gapLanguage('xx', 'yue')).toBe('en')   // unknown code falls back, never guesses
    expect(normalizeGapLanguage(' ES ')).toBe('es')
  })
})

describe('gap reply by language', () => {
  it('keeps the English reply byte for byte, topic included', () => {
    expect(groundingGapReply('pricing')).toBe(
      'I haven\'t left a settled position on pricing in the record, so I won\'t put words in my own mouth now. ' +
      'That\'s a call you\'ll have to make with the people in the room. ' +
      'I\'ll tell you how I think in general, but I won\'t pretend I decided this one when I didn\'t.',
    )
    expect(groundingGapReply('pricing', 'en')).toBe(groundingGapReply('pricing'))
    expect(groundingGapReply('')).toContain('on this in the record')
  })

  it('serves every email language the product has, topic-free, and never the template phrase', () => {
    const langs = Object.keys(GAP_REPLY_BY_LANGUAGE).sort()
    expect(langs).toEqual(['es', 'ja', 'ko', 'tl', 'vi', 'yue', 'zh'])
    for (const lang of langs) {
      const r = groundingGapReply('pricing', lang)
      expect(r).toBe(GAP_REPLY_BY_LANGUAGE[lang as keyof typeof GAP_REPLY_BY_LANGUAGE])
      expect(r).not.toContain('pricing')
      expect(r).not.toMatch(/[—―]/)
      expect(r).not.toMatch(/!/)
      expect(r.length).toBeGreaterThan(60)
    }
    expect(groundingGapReply('x', 'fr')).toBe(groundingGapReply('x', 'en'))
  })
})
