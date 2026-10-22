import { describe, it, expect } from 'vitest'
import { allProbeCopy, renderProbe, verbatimSpan } from './renderProbe'
import { deriveReadAnchor } from './incidentSession'
import { QUESTION_LENSES } from './questionLens'

const ANSWER = 'The invoices started coming in late, and then Marcus stopped returning my calls. I knew then.'

describe('the guarded quote', () => {
  it('returns the span in the person\'s own casing when the fragment is a literal span', () => {
    expect(verbatimSpan('marcus stopped returning my calls', ANSWER)).toBe('Marcus stopped returning my calls')
    expect(verbatimSpan('  the invoices   started coming in late. ', ANSWER)).toBe('The invoices started coming in late')
  })

  it('refuses a paraphrase, however close', () => {
    expect(verbatimSpan('Marcus stopped calling me back', ANSWER)).toBeNull()
    expect(verbatimSpan('the invoices were late', ANSWER)).toBeNull()
  })

  it('refuses half a word, a fragment under three words, and one over fourteen', () => {
    expect(verbatimSpan('voices started coming in', ANSWER)).toBeNull()
    expect(verbatimSpan('I knew', ANSWER)).toBeNull()
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen'
    expect(verbatimSpan(long, long)).toBeNull()
  })

  it('refuses a span it would have to alter to render', () => {
    expect(verbatimSpan('he said "not now" and left', 'Then he said "not now" and left.')).toBeNull()
    expect(verbatimSpan('we waited — too long', 'So we waited — too long, I think.')).toBeNull()
    expect(verbatimSpan('no! get out of my office', 'I told him no! get out of my office and he did')).toBeNull()
  })

  it('handles empty and missing input', () => {
    expect(verbatimSpan('', ANSWER)).toBeNull()
    expect(verbatimSpan('anything at all', undefined)).toBeNull()
    expect(verbatimSpan('anything at all', '')).toBeNull()
  })

  it('finds a later whole word match when an earlier one is inside a word', () => {
    expect(verbatimSpan('art of the deal', 'The part of the dealer was small. The art of the deal was not.')).toBe('art of the deal')
  })
})

describe('probes that use what was said', () => {
  const anchor = 'Marcus stopped returning my calls'

  it('quotes a literal span, in quotation marks, on the seven probes that carry one', () => {
    for (const probeType of ['CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR', 'ANALOGUE', 'GOAL'] as const) {
      const q = renderProbe({ probeType, anchor: 'marcus stopped returning my calls', answer: ANSWER })
      expect(q, probeType).toMatch(/^You (said|mentioned) "Marcus stopped returning my calls\." /)
      expect(/[?.]$/.test(q.trim()), probeType).toBe(true)
    }
  })

  it('asks the plain question when the fragment is not the person\'s words', () => {
    const q = renderProbe({ probeType: 'CUE', anchor: 'Marcus went silent on me', answer: ANSWER })
    expect(q).toBe('What was the first sign that something was off?')
    expect(renderProbe({ probeType: 'OPTION', anchor: 'Marcus went silent on me', answer: ANSWER }))
      .toBe('Once you saw that, what did you seriously consider doing? Include what you decided against.')
    for (const probeType of ['BASIS', 'BOUNDARY', 'ERROR', 'ANALOGUE', 'GOAL'] as const) {
      expect(renderProbe({ probeType, anchor: 'Marcus went silent on me', answer: ANSWER }), probeType).not.toMatch(/You (said|mentioned)/)
    }
  })

  it('never quotes across decision points, on a second ask, or on the dimension probes', () => {
    expect(renderProbe({ probeType: 'CUE', anchor, answer: ANSWER, quote: false })).toBe('What was the first sign that something was off?')
    for (const probeType of ['STAKE', 'READ', 'CALIBRATION', 'TRADEOFF', 'TIMELINE'] as const) {
      expect(renderProbe({ probeType, anchor, answer: ANSWER, said: [ANSWER] }), probeType).not.toContain('"')
    }
  })

  it('leaves a quoted span exactly as the person said it', () => {
    const a = 'We paid him , and then, well, we paid him again.'
    const q = renderProbe({ probeType: 'BASIS', anchor: 'we paid him , and then, well, we paid him again', answer: a })
    expect(q).toContain('"We paid him , and then, well, we paid him again."')
  })

  it('with no answer passed, behaves as it did before: CUE quotes unchecked, nothing else quotes', () => {
    expect(renderProbe({ probeType: 'CUE', anchor: 'The invoices were late.' }))
      .toBe('You said the invoices were late. What was the first sign, before that, that something was off?')
    expect(renderProbe({ probeType: 'OPTION', anchor }))
      .toBe('Once you saw that, what did you seriously consider doing? Include what you decided against.')
    expect(renderProbe({ probeType: 'GOAL', anchor })).toBe('Set the decision aside. What were you actually trying to protect?')
    expect(renderProbe({ probeType: 'READ', anchor: 'Marcus and Priya' })).toBe('What was your read on Marcus and Priya while this was happening?')
    expect(['Someone capable but new inherits this exact situation. Where do they get it wrong?', 'What is the trap here that is not obvious?'])
      .toContain(renderProbe({ probeType: 'ERROR', anchor }))
    expect(renderProbe({ probeType: 'TRADEOFF', anchor: '', tensionForTradeoff: 'speed vs certainty' }))
      .toBe('Suppose you could not protect both. Speed or certainty, which goes, and why?')
    expect(renderProbe({ probeType: 'SEED', anchor: '', seedText: ' Tell me about it. ' })).toBe('Tell me about it.')
  })
})

describe('the second ask', () => {
  it('is a different question from the first, for every spine position', () => {
    for (const probeType of ['CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR'] as const) {
      const first: string[] = []
      // Both hash variants of the first ask.
      for (const a of ['a', 'ab', 'abc', 'abcd']) first.push(renderProbe({ probeType, anchor: a, answer: 'x' }))
      const second = renderProbe({ probeType, anchor: 'a', answer: 'x', reprobe: true })
      expect(first, probeType).not.toContain(second)
      expect(second, probeType).not.toMatch(/You (said|mentioned)/)
    }
  })

  it('never quotes the thin answer back', () => {
    const q = renderProbe({ probeType: 'BASIS', anchor: 'marcus stopped returning my calls', answer: ANSWER, reprobe: true })
    expect(q).toBe('Give me the one fact that settled it. If it had been different, what would you have done?')
  })
})

describe('the tradeoff does not lead', () => {
  it('names the two goods only when both are the person\'s own words in this call', () => {
    const said = ['I wanted speed more than anything.', 'But I could not live without certainty on the price.']
    expect(renderProbe({ probeType: 'TRADEOFF', anchor: '', tensionForTradeoff: 'speed vs certainty', said }))
      .toBe('Suppose you could not protect both. Speed or certainty, which goes, and why?')
    expect(renderProbe({ probeType: 'TRADEOFF', anchor: '', tensionForTradeoff: 'loyalty vs growth', said }))
      .toBe('When two things you cared about pulled against each other here, which gave way?')
    expect(renderProbe({ probeType: 'TRADEOFF', anchor: '', tensionForTradeoff: 'speed vs loyalty', said }))
      .not.toContain('loyalty')
  })

  it('asks three different plain questions across the battery', () => {
    const said = ['nothing that names a tension']
    const qs = [0, 1, 2].map(i => renderProbe({ probeType: 'TRADEOFF', anchor: '', tensionForTradeoff: 'a vs b', said, tradeoffIndex: i }))
    expect(new Set(qs).size).toBe(3)
    expect(renderProbe({ probeType: 'TRADEOFF', anchor: '', said, tradeoffIndex: 3 })).toBe(qs[0])
  })
})

describe('lens wording', () => {
  it('words the inheritor differently for each lens, and keeps the shared trap variant', () => {
    const seen = new Set<string>()
    for (const lens of QUESTION_LENSES) {
      const both = new Set(['a', 'ab', 'abc', 'abcd'].map(a => renderProbe({ probeType: 'ERROR', anchor: a, lens })))
      expect(both.has('What is the trap here that is not obvious?'), lens).toBe(true)
      expect(both.size, lens).toBe(2)
      for (const q of both) if (q !== 'What is the trap here that is not obvious?') seen.add(q)
      expect([...both].join(' '), lens).not.toContain('capable but new')
    }
    expect(seen.size).toBe(QUESTION_LENSES.length)
  })

  it('asks a lens specific rule level BOUNDARY, without a quote, and leaves the branch level one shared', () => {
    const rules = QUESTION_LENSES.map(lens => renderProbe({ probeType: 'BOUNDARY', anchor: 'marcus stopped returning my calls', answer: ANSWER, level: 'rule', lens }))
    expect(new Set(rules).size).toBe(QUESTION_LENSES.length)
    for (const q of rules) expect(q).not.toContain('"')
    // Nor does the rule level ERROR that follows it.
    for (const lens of QUESTION_LENSES) {
      expect(renderProbe({ probeType: 'ERROR', anchor: 'marcus stopped returning my calls', answer: ANSWER, level: 'rule', lens }), lens).not.toContain('"')
    }
    for (const lens of QUESTION_LENSES) {
      expect(['What would have had to be different for you to go the other way?', 'Under what conditions do you reverse this?'])
        .toContain(renderProbe({ probeType: 'BOUNDARY', anchor: 'x', lens }))
    }
  })

  it('a church call never puts a name in a question', () => {
    expect(renderProbe({ probeType: 'READ', anchor: 'Marcus and Priya', lens: 'church' }))
      .toBe('What was your read on the people involved while this was happening?')
    expect(renderProbe({ probeType: 'READ', anchor: 'Marcus and Priya', lens: 'personal' })).toContain('Marcus and Priya')
    expect(renderProbe({ probeType: 'GOAL', anchor: '', lens: 'church' })).toBe('Set the decision aside. Who or what were you trying to protect?')
  })
})

describe('names in the people probe', () => {
  const branches = [{ summary: 'Whether to keep Marcus after Priya raised the audit', chosen: 'Let Marcus go and told Dana first' }]
  const tidy = [{ summary: 'Whether to keep Marcus after Priya raised the audit', chosen: 'released Marcus and told Dana first' }]

  it('without what was said, keeps every name the timeline carries (the reducer\'s askable check)', () => {
    expect(deriveReadAnchor(tidy)).toBe('Marcus, Priya, and Dana')
    // The summaries are model text, and a verb that starts a sentence passes
    // for a name. This is why the route never renders from this form.
    expect(deriveReadAnchor(branches)).toBe('Marcus, Priya, and Let')
  })

  it('with what was said, keeps only the names the person used, as whole words', () => {
    expect(deriveReadAnchor(branches, ['Marcus had been with me nine years.', 'I told Dana before anyone.'])).toBe('Marcus and Dana')
    expect(deriveReadAnchor(branches, ['My manager had been with me nine years.'])).toBe('')
    expect(deriveReadAnchor(branches, ['The Danas of the world.'])).toBe('')
  })

  it('drops a sentence opener the timeline capitalized, even when the person said the word', () => {
    expect(deriveReadAnchor(branches, ['Let me think. I had to let Marcus go, and Dana knew first.'])).toBe('Marcus and Dana')
  })
})

describe('probe copy', () => {
  it('obeys the copy rules', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI|thoughtful|meaningful|steady|dependable)\b/
    const tells = /this matters|matters most|just as important|looking ahead|what comes next|in practice|rather than simply/i
    for (const s of allProbeCopy()) {
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
      expect(s, s).not.toMatch(tells)
      // No hyphenated words in copy.
      expect(s, s).not.toMatch(/[A-Za-z]-[A-Za-z]/)
    }
  })

  it('is deterministic', () => {
    const input = { probeType: 'BASIS' as const, anchor: 'marcus stopped returning my calls', answer: ANSWER, lens: 'personal' as const }
    expect(renderProbe(input)).toBe(renderProbe(input))
  })
})
