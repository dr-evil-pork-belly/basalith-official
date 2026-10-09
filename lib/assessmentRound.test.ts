import { describe, it, expect } from 'vitest'
import { B2B_DOMAINS } from './b2bDomains'
import { COVERAGE_PROBES } from './coverageProbes'
import { AREA_SEEDS } from './areaSeeds'
import { DEPENDENCY_QUESTIONS } from './dependencyIntake'
import {
  DEPENDENCY_PER_DOMAIN,
  ROUND_PER_DOMAIN,
  ROUND_QUESTIONS,
  RULES_PER_DOMAIN,
  allRoundCopy,
  allRoundPrompts,
  answeredRoundKeys,
  areasWithRoundDone,
  roundFor,
  roundProgress,
  roundQuestionByKey,
} from './assessmentRound'

const DOMAINS = B2B_DOMAINS.map(d => d.name)
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

describe('the round', () => {
  it('has four rule and two dependency questions for each live business domain, rules first', () => {
    expect(ROUND_QUESTIONS).toHaveLength(DOMAINS.length * ROUND_PER_DOMAIN)
    for (const d of DOMAINS) {
      const qs = roundFor(d)
      expect(qs.map(q => q.kind), d).toEqual([
        ...Array(RULES_PER_DOMAIN).fill('rule'),
        ...Array(DEPENDENCY_PER_DOMAIN).fill('dependency'),
      ])
    }
    expect(roundFor('Money')).toEqual([])
    expect(new Set(ROUND_QUESTIONS.map(q => q.key)).size).toBe(ROUND_QUESTIONS.length)
    expect(roundQuestionByKey('capital-rule-2')?.domain).toBe('Capital')
    expect(roundQuestionByKey('nope')).toBeNull()
  })

  it('repeats no coverage probe, no area opener, no intake question, and no other round question', () => {
    const probes  = new Set(COVERAGE_PROBES.map(p => norm(p.question)))
    const openers = new Set([...AREA_SEEDS.business, ...AREA_SEEDS.personal].map(s => norm(s.question)))
    const intake  = new Set(DEPENDENCY_QUESTIONS.map(q => norm(q.question)))
    const seen = new Set<string>()
    for (const q of ROUND_QUESTIONS) {
      const t = norm(q.question)
      expect(probes.has(t), q.key).toBe(false)
      expect(openers.has(t), q.key).toBe(false)
      expect(intake.has(t), q.key).toBe(false)
      expect(seen.has(t), q.key).toBe(false)
      seen.add(t)
    }
  })

  it('does not lift a probe: no question shares a run of six words with any probe', () => {
    // Aiming at the same judgment is the point. Borrowing the probe's own
    // sentence is not: it would turn the reading into a recall test.
    const grams = (s: string) => {
      const w = norm(s).replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean)
      const out = new Set<string>()
      for (let i = 0; i + 6 <= w.length; i++) out.add(w.slice(i, i + 6).join(' '))
      return out
    }
    const probeGrams = new Set<string>()
    for (const p of COVERAGE_PROBES) for (const g of grams(p.question)) probeGrams.add(g)
    for (const q of ROUND_QUESTIONS) {
      for (const g of grams(q.question)) expect(probeGrams.has(g), `${q.key}: "${g}"`).toBe(false)
    }
  })

  it('obeys the copy rules', () => {
    const banned = /\b(curated|seamless|innovative|stewardship|unlock|supercharge|game-changer|AI|archive)\b/
    for (const s of allRoundCopy()) {
      expect(s, s).not.toMatch(/[—―]/)
      expect(s, s).not.toMatch(/!/)
      expect(s, s).not.toMatch(banned)
      expect(s, s).not.toMatch(/\w-\w/)
      expect(s.trim().endsWith('?') || s.trim().endsWith('.'), s).toBe(true)
    }
  })
})

describe('round tracking', () => {
  const capital = roundFor('Capital')

  it('finds an answer by its question text, exactly, and ignores everything else on the record', () => {
    const prompts = [
      capital[0].question,
      `  ${capital[1].question}  `,
      capital[2].question.toUpperCase(),
      `${capital[3].question} And then?`,
      'Tell me about a time cash was tight.',
      'What finally tipped it?',
    ]
    expect([...answeredRoundKeys(prompts)].sort()).toEqual(['capital-rule-1', 'capital-rule-2'])
  })

  it('walks a domain in order, counts a repeat once, and is done at six', () => {
    expect(roundProgress('Capital', [])).toMatchObject({ answered: 0, total: 6, done: false })
    expect(roundProgress('Capital', []).next?.key).toBe('capital-rule-1')

    const some = [capital[0].question, capital[0].question, capital[2].question]
    const p = roundProgress('Capital', some)
    expect(p.answered).toBe(2)
    expect(p.next?.key).toBe('capital-rule-2')
    expect(p.questions.map(q => q.answered)).toEqual([true, false, true, false, false, false])

    const all = roundProgress('Capital', capital.map(q => q.question))
    expect(all).toMatchObject({ answered: 6, total: 6, done: true, next: null })
  })

  it('never calls an unknown domain done', () => {
    expect(roundProgress('Money', allRoundPrompts())).toMatchObject({ answered: 0, total: 0, done: false, next: null })
  })

  it('lists the finished domains in domain order', () => {
    const prompts = [...roundFor('Risk'), ...roundFor('Decision-Making'), ...roundFor('People').slice(0, 5)].map(q => q.question)
    expect(areasWithRoundDone(prompts)).toEqual(['Decision-Making', 'Risk'])
    expect(areasWithRoundDone(allRoundPrompts())).toEqual(DOMAINS)
    expect(areasWithRoundDone([])).toEqual([])
  })
})
