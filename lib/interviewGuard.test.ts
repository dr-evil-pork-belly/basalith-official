import { describe, it, expect } from 'vitest'
import { checkDraft, parseVerdict, quotedSpans, MAX_WORDS, type GuardContext } from './interviewGuard'
import { COVERAGE_PROBES } from './coverageProbes'

const said = [
  'My site manager Marcus was skimming on a job in Riverside. I found out in March and let him go in April.',
  'The supplier said he had been paid in cash twice. Nobody pays cash on my jobs.',
  'Loyalty mattered to me, but so did certainty.',
]
const ctx = (over: Partial<GuardContext> = {}): GuardContext => ({ said, probeType: 'BASIS', lens: 'succession', ...over })

describe('checkDraft', () => {
  it('passes a plain question built on the person\'s words', () => {
    expect(checkDraft('You said "Nobody pays cash on my jobs." Where did that rule come from?', ctx())).toEqual([])
    expect(checkDraft('What did you do the morning after the supplier called?', ctx())).toEqual([])
  })

  it('passes a name the person used, and fails one they did not', () => {
    expect(checkDraft('What was your read on Marcus that week?', ctx({ probeType: 'READ' }))).toEqual([])
    expect(checkDraft('What was your read on Priya that week?', ctx({ probeType: 'READ' }))).toContain('unsaid_name')
  })

  it('allows no name at all on a church call, quoted or not', () => {
    expect(checkDraft('What was your read on Marcus that week?', ctx({ lens: 'church' }))).toContain('name_in_church_call')
    expect(checkDraft('You said "My site manager Marcus was skimming." What did you see first?', ctx({ lens: 'church' })))
      .toContain('name_in_church_call')
    expect(checkDraft('What did you see first, before that call?', ctx({ lens: 'church' }))).toEqual([])
  })

  it('fails a quote that is not a literal span of what was said', () => {
    expect(checkDraft('You said "nobody ever pays cash." Why?', ctx())).toContain('quote_not_verbatim')
  })

  it('fails anything but exactly one question, at the end', () => {
    expect(checkDraft('Why then? Why not earlier?', ctx())).toContain('not_one_question')
    expect(checkDraft('Tell me about the morning after.', ctx())).toContain('not_one_question')
  })

  it('fails an offer of options, except a tradeoff in the person\'s own quoted words', () => {
    expect(checkDraft('Was it about the money or the trust?', ctx())).toContain('either_or')
    expect(checkDraft('Was it about the money or the trust?', ctx({ probeType: 'TRADEOFF' }))).toContain('either_or')
    expect(checkDraft('"Loyalty mattered to me" or "so did certainty", which gave way?', ctx({ probeType: 'TRADEOFF' })))
      .toEqual([])
  })

  it('fails summaries, praise, and persona', () => {
    expect(checkDraft('So the cash was the real signal for you?', ctx())).toContain('summary')
    expect(checkDraft('It sounds like trust broke first. When?', ctx())).toContain('summary')
    expect(checkDraft('That is a powerful story. What came next?', ctx())).toContain('praise')
    expect(checkDraft('I understand. What came next?', ctx())).toContain('persona')
  })

  it('holds the copy rules', () => {
    expect(checkDraft('What came next \u2014 the books?', ctx())).toContain('em_dash')
    expect(checkDraft('What was the follow-up?', ctx())).toContain('hyphen')
    expect(checkDraft('What came next!?', ctx())).toContain('exclamation')
    expect(checkDraft('What does your archive say about it?', ctx())).toContain('banned_word')
    const long = `What ${'very '.repeat(MAX_WORDS)}long thing happened?`
    expect(checkDraft(long, ctx())).toContain('too_long')
    expect(checkDraft('   ', ctx())).toEqual(['empty'])
  })

  it('fails a question that borrows six words in a row from a coverage probe', () => {
    const borrowed = COVERAGE_PROBES[0].question.split(/\s+/).slice(0, 8).join(' ').replace(/[.,]$/, '') + '?'
    expect(checkDraft(borrowed, ctx())).toContain('probe_overlap')
  })
})

describe('quotedSpans', () => {
  it('reads straight and curly quotes', () => {
    expect(quotedSpans('You said "a b c" and “d e f”. Why?')).toEqual(['a b c', 'd e f'])
  })
})

describe('parseVerdict', () => {
  it('reads a pass and a fail', () => {
    expect(parseVerdict('{"pass": true, "reason": "ok"}')).toEqual({ pass: true, reason: 'ok' })
    expect(parseVerdict('```json\n{"pass": false, "reason": "A presupposes motive"}\n```')).toEqual({ pass: false, reason: 'A presupposes motive' })
  })
  it('fails closed on anything unreadable', () => {
    expect(parseVerdict('sure, looks fine').pass).toBe(false)
    expect(parseVerdict('{"pass": "yes"}').pass).toBe(false)
    expect(parseVerdict('{not json}').pass).toBe(false)
  })
})

// October 28, 2026. An opener (probe type SEED) has its own shape rule; a
// follow up keeps the old one. docs/GENERIC_QUESTIONS_SLICE_2_2026-10-28.md.
describe('the opener shape', () => {
  it('does not loosen the follow up rule', () => {
    const ctx = { said: ['We sell trucks.'], probeType: 'CUE' as const, lens: 'succession' as const }
    expect(checkDraft('Tell me about the first sign.', ctx)).toContain('not_one_question')
  })
})
