import { describe, it, expect, vi } from 'vitest'
import {
  selectNextQuestion,
  band,
  effectiveDensity,
  getEligibleDomains,
  pickDomainP1,
  pickDomainP2P3,
  pickQuestionB2C,
  pickQuestionB2B,
  validateFraming,
  type Deps,
  type DomainCoverage,
  type HistoryEntry,
  type ElicitationQuestion,
  type B2BQuestion,
  type MirrorReflectionRow,
  type AnchorDeposit,
} from './selectNextQuestion'

const NOW = new Date('2026-06-11T12:00:00Z')

function domain(over: Partial<DomainCoverage> & { domainId: number }): DomainCoverage {
  return {
    slug:            `domain-${over.domainId}`,
    emotionalWeight: 1,
    density:         0,
    avgDepth:        2,
    lastTouched:     null,
    ...over,
  }
}

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  const base: Deps = {
    getArchiveScope:            vi.fn().mockResolvedValue('b2c'),
    getOwnerDepositCount:       vi.fn().mockResolvedValue(50),
    getCoverage:                vi.fn().mockResolvedValue([]),
    getQuestionHistory:         vi.fn().mockResolvedValue([]),
    getNotQuiteRightReflection: vi.fn().mockResolvedValue(null),
    getElicitationQuestions:    vi.fn().mockResolvedValue([]),
    getB2BQuestions:            vi.fn().mockResolvedValue([]),
    getAnchorDeposit:           vi.fn().mockResolvedValue(null),
    getReflectionAnchorDeposit: vi.fn().mockResolvedValue(null),
    generateFramingSentence:    vi.fn().mockResolvedValue(null),
    generateP0Question:         vi.fn().mockResolvedValue({ questionText: 'p0 question', framingUsed: null }),
    insertQuestionHistory:      vi.fn().mockResolvedValue(undefined),
    random:                     () => 0,
  }
  return { ...base, ...overrides }
}

// ── band() ───────────────────────────────────────────────────────────────────

describe('band', () => {
  it('classifies pre-Echo, standard, and deep correctly', () => {
    expect(band(0)).toBe('p1')
    expect(band(9)).toBe('p1')
    expect(band(10)).toBe('p2')
    expect(band(199)).toBe('p2')
    expect(band(200)).toBe('p3')
  })
})

// ── P0 beats everything ─────────────────────────────────────────────────────

describe('P0 REPAIR', () => {
  it('short-circuits before any coverage/band logic when a recent "not quite right" reflection exists', async () => {
    const reflection: MirrorReflectionRow = {
      id: 'refl-1',
      reflection: 'I noticed you mentioned moving to the coast in 1985.',
      threadQuestion: 'What made you choose that town specifically?',
      depositIds: ['dep-1'],
    }
    const anchor: AnchorDeposit = { id: 'dep-1', prompt: 'Tell me about a move', response: 'We moved to the coast in 1983, not 1985.' }

    const deps = makeDeps({
      getNotQuiteRightReflection: vi.fn().mockResolvedValue(reflection),
      getReflectionAnchorDeposit: vi.fn().mockResolvedValue(anchor),
      generateP0Question: vi.fn().mockResolvedValue({
        questionText: 'What year did you actually move, and what made you pick that town?',
        framingUsed: 'I had been thinking you moved to the coast around 1985.',
      }),
    })

    const result = await selectNextQuestion({ archiveId: 'arch-1', channel: 'daily_email', now: NOW }, deps)

    expect(result.source).toBe('p0')
    expect(result.domainId).toBeNull()
    expect(result.questionId).toBeNull()
    expect(result.b2bQuestionId).toBeNull()
    expect(result.questionText).toContain('actually move')
    expect(result.framingUsed).toContain('coast')

    // None of the band/coverage machinery should have run.
    expect(deps.getArchiveScope).not.toHaveBeenCalled()
    expect(deps.getOwnerDepositCount).not.toHaveBeenCalled()
    expect(deps.getCoverage).not.toHaveBeenCalled()

    expect(deps.insertQuestionHistory).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'p0', archiveId: 'arch-1', channel: 'daily_email' }),
    )
  })
})

// ── Pre-Echo never serves weight-3 domains ──────────────────────────────────

describe('pickDomainP1 (pre-Echo)', () => {
  it('never picks an emotional_weight 3 domain even if it has the lowest density', () => {
    const HEAVY = 1, A = 2, B = 3, C = 4, D = 5

    const coverage: DomainCoverage[] = [
      domain({ domainId: HEAVY, emotionalWeight: 3, density: 0 }),
      domain({ domainId: A, emotionalWeight: 1, density: 5 }),
      domain({ domainId: B, emotionalWeight: 1, density: 10 }),
      domain({ domainId: C, emotionalWeight: 1, density: 15 }),
      domain({ domainId: D, emotionalWeight: 1, density: 20 }),
    ]

    const picked = pickDomainP1(coverage, [], NOW)
    expect(picked?.emotionalWeight).toBe(1)
    expect(picked?.domainId).not.toBe(HEAVY)
  })

  it('never picks an emotional_weight 2 domain pre-Echo either', () => {
    const MID = 1, A = 2, B = 3

    const coverage: DomainCoverage[] = [
      domain({ domainId: MID, emotionalWeight: 2, density: 0 }),
      domain({ domainId: A, emotionalWeight: 1, density: 5 }),
      domain({ domainId: B, emotionalWeight: 1, density: 10 }),
    ]

    const picked = pickDomainP1(coverage, [], NOW)
    expect(picked?.domainId).not.toBe(MID)
  })

  it('rotates among the 3 lowest-density weight-1 domains, picking least-recently-served', () => {
    const A = 1, B = 2, C = 3, D = 4

    const coverage: DomainCoverage[] = [
      domain({ domainId: A, emotionalWeight: 1, density: 1 }),
      domain({ domainId: B, emotionalWeight: 1, density: 2 }),
      domain({ domainId: C, emotionalWeight: 1, density: 3 }),
      domain({ domainId: D, emotionalWeight: 1, density: 100 }), // not in lowest 3
    ]

    const history: HistoryEntry[] = [
      { domainId: B, questionId: 101, b2bQuestionId: null, servedAt: daysAgo(1), answeredAt: null },
      { domainId: A, questionId: 102, b2bQuestionId: null, servedAt: daysAgo(10), answeredAt: null },
      // C never served -> should win (least recently served = -Infinity)
    ]

    const picked = pickDomainP1(coverage, history, NOW)
    expect(picked?.domainId).toBe(C)
  })
})

// ── Consecutive-domain cooldown ─────────────────────────────────────────────

describe('consecutive-domain cooldown', () => {
  it('excludes the domain served immediately before, even if it is now lowest density', () => {
    const LAST_SERVED = 1, NEXT_BEST = 2

    const coverage: DomainCoverage[] = [
      domain({ domainId: LAST_SERVED, emotionalWeight: 1, density: 0 }),
      domain({ domainId: NEXT_BEST, emotionalWeight: 1, density: 5 }),
    ]
    const history: HistoryEntry[] = [
      { domainId: LAST_SERVED, questionId: 101, b2bQuestionId: null, servedAt: daysAgo(1), answeredAt: null },
    ]

    const eligible = getEligibleDomains(coverage, history, NOW)
    expect(eligible.map(d => d.domainId)).not.toContain(LAST_SERVED)

    const picked = pickDomainP2P3(coverage, history, 'p2', () => 0, NOW)
    expect(picked?.domainId).toBe(NEXT_BEST)
  })
})

// ── Weight-3 spacing rules ───────────────────────────────────────────────────

describe('weight-3 spacing', () => {
  it('excludes a weight-3 domain served less than 5 days ago', () => {
    const HEAVY = 1, OTHER = 2

    const coverage: DomainCoverage[] = [
      domain({ domainId: HEAVY, emotionalWeight: 3, density: 0 }),
      domain({ domainId: OTHER, emotionalWeight: 1, density: 10 }),
    ]
    const history: HistoryEntry[] = [
      { domainId: OTHER, questionId: 101, b2bQuestionId: null, servedAt: daysAgo(1), answeredAt: null },
      { domainId: HEAVY, questionId: 102, b2bQuestionId: null, servedAt: daysAgo(3), answeredAt: 'sometime' },
    ]

    const eligible = getEligibleDomains(coverage, history, NOW)
    expect(eligible.map(d => d.domainId)).not.toContain(HEAVY)
  })

  it('allows a weight-3 domain served exactly 5+ days ago', () => {
    const HEAVY = 1, OTHER = 2

    const coverage: DomainCoverage[] = [
      domain({ domainId: HEAVY, emotionalWeight: 3, density: 0 }),
      domain({ domainId: OTHER, emotionalWeight: 1, density: 10 }),
    ]
    const history: HistoryEntry[] = [
      { domainId: OTHER, questionId: 101, b2bQuestionId: null, servedAt: daysAgo(1), answeredAt: null },
      { domainId: HEAVY, questionId: 102, b2bQuestionId: null, servedAt: daysAgo(6), answeredAt: 'sometime' },
    ]

    const eligible = getEligibleDomains(coverage, history, NOW)
    expect(eligible.map(d => d.domainId)).toContain(HEAVY)
  })

  it('never serves a weight-3 domain immediately after another weight-3 domain, regardless of spacing', () => {
    const HEAVY1 = 1, HEAVY2 = 2, OTHER = 3

    const coverage: DomainCoverage[] = [
      domain({ domainId: HEAVY1, emotionalWeight: 3, density: 0 }),
      domain({ domainId: HEAVY2, emotionalWeight: 3, density: 1 }),
      domain({ domainId: OTHER, emotionalWeight: 1, density: 50 }),
    ]
    // Most recent serve was heavy-1 (10 days ago, so its own spacing rule would clear).
    const history: HistoryEntry[] = [
      { domainId: HEAVY1, questionId: 101, b2bQuestionId: null, servedAt: daysAgo(10), answeredAt: 'sometime' },
    ]

    const eligible = getEligibleDomains(coverage, history, NOW)
    expect(eligible.map(d => d.domainId)).not.toContain(HEAVY1) // consecutive-domain rule
    expect(eligible.map(d => d.domainId)).not.toContain(HEAVY2) // weight-3-after-weight-3 rule
    expect(eligible.map(d => d.domainId)).toContain(OTHER)
  })
})

// ── Depth-discounted ranking (P3) ───────────────────────────────────────────

describe('depth-discounted ranking (P3)', () => {
  it('picks the facts-only domain over the balanced domain when raw density is equal', () => {
    const FACTS = 1, BALANCED = 2

    const factsOnly = domain({ domainId: FACTS, emotionalWeight: 1, density: 12, avgDepth: 1 })
    const balanced  = domain({ domainId: BALANCED, emotionalWeight: 1, density: 12, avgDepth: 3 })

    expect(effectiveDensity(factsOnly)).toBeLessThan(effectiveDensity(balanced))

    const picked = pickDomainP2P3([factsOnly, balanced], [], 'p3', () => 0, NOW)
    expect(picked?.domainId).toBe(FACTS)
  })

  it('would pick the balanced domain under raw density (P2) ranking instead', () => {
    // Same coverage, but P2 ranks by raw density, so it is a tie broken by
    // array order (reduce keeps the first on ties) -- demonstrate P2 does NOT
    // discount by depth by giving facts-only a higher raw density.
    const FACTS = 1, BALANCED = 2

    const factsOnly = domain({ domainId: FACTS, emotionalWeight: 1, density: 20, avgDepth: 1 })
    const balanced  = domain({ domainId: BALANCED, emotionalWeight: 1, density: 12, avgDepth: 3 })

    const pickedP2 = pickDomainP2P3([factsOnly, balanced], [], 'p2', () => 0, NOW)
    expect(pickedP2?.domainId).toBe(BALANCED) // lower raw density wins under P2

    const pickedP3 = pickDomainP2P3([factsOnly, balanced], [], 'p3', () => 0, NOW)
    expect(pickedP3?.domainId).toBe(FACTS) // lower effective density wins under P3
  })
})

// ── Unanswered re-entry at 30 days ──────────────────────────────────────────

describe('unanswered question re-entry', () => {
  const D1 = 1
  const Q1 = 101

  const bank: ElicitationQuestion[] = [
    { id: Q1, domainId: D1, tier: 'standard', questionText: 'Question 1' },
  ]

  it('excludes a question served unanswered less than 30 days ago', () => {
    const history: HistoryEntry[] = [
      { domainId: D1, questionId: Q1, b2bQuestionId: null, servedAt: daysAgo(29), answeredAt: null },
    ]
    expect(pickQuestionB2C(D1, 'p2', history, bank, NOW)).toBeNull()
  })

  it('re-includes a question served unanswered 30+ days ago', () => {
    const history: HistoryEntry[] = [
      { domainId: D1, questionId: Q1, b2bQuestionId: null, servedAt: daysAgo(31), answeredAt: null },
    ]
    expect(pickQuestionB2C(D1, 'p2', history, bank, NOW)?.id).toBe(Q1)
  })

  it('excludes a question answered within the last 180 days even if served long ago', () => {
    const history: HistoryEntry[] = [
      { domainId: D1, questionId: Q1, b2bQuestionId: null, servedAt: daysAgo(200), answeredAt: daysAgo(100) },
    ]
    expect(pickQuestionB2C(D1, 'p2', history, bank, NOW)).toBeNull()
  })

  it('re-includes a question answered 180+ days ago', () => {
    const history: HistoryEntry[] = [
      { domainId: D1, questionId: Q1, b2bQuestionId: null, servedAt: daysAgo(200), answeredAt: daysAgo(181) },
    ]
    expect(pickQuestionB2C(D1, 'p2', history, bank, NOW)?.id).toBe(Q1)
  })
})

// ── B2B question selection by order_index ───────────────────────────────────

describe('pickQuestionB2B', () => {
  it('orders by order_index and respects cooldowns', () => {
    const D1 = 1

    const bank: B2BQuestion[] = [
      { id: 'b3', domainId: D1, question: 'Third', orderIndex: 3 },
      { id: 'b1', domainId: D1, question: 'First', orderIndex: 1 },
      { id: 'b2', domainId: D1, question: 'Second', orderIndex: 2 },
    ]

    expect(pickQuestionB2B(D1, [], bank, NOW)?.id).toBe('b1')

    const history: HistoryEntry[] = [
      { domainId: D1, questionId: null, b2bQuestionId: 'b1', servedAt: daysAgo(200), answeredAt: daysAgo(10) },
    ]
    expect(pickQuestionB2B(D1, history, bank, NOW)?.id).toBe('b2')
  })
})

// ── 80/20 split is seedable/deterministic ───────────────────────────────────

describe('80/20 domain selection split', () => {
  const LOWEST = 1, MID = 2, HIGHEST = 3

  const coverage: DomainCoverage[] = [
    domain({ domainId: LOWEST, emotionalWeight: 1, density: 1 }),
    domain({ domainId: MID, emotionalWeight: 1, density: 5 }),
    domain({ domainId: HIGHEST, emotionalWeight: 1, density: 10 }),
  ]

  it('picks the lowest-density domain when random() < 0.8', () => {
    expect(pickDomainP2P3(coverage, [], 'p2', () => 0, NOW)?.domainId).toBe(LOWEST)
    expect(pickDomainP2P3(coverage, [], 'p2', () => 0.79, NOW)?.domainId).toBe(LOWEST)
  })

  it('picks a uniformly-random eligible domain (by index) when random() >= 0.8', () => {
    // random() called twice: first for the 80/20 gate, second for the index.
    // index = floor(secondRandom * eligible.length)
    const sequence = [0.8, 0]
    let i = 0
    const random = () => sequence[i++]
    expect(pickDomainP2P3(coverage, [], 'p2', random, NOW)?.domainId).toBe(LOWEST) // index 0

    const sequence2 = [0.99, 0.999]
    let j = 0
    const random2 = () => sequence2[j++]
    expect(pickDomainP2P3(coverage, [], 'p2', random2, NOW)?.domainId).toBe(HIGHEST) // index 2
  })
})

// ── validateFraming ───────────────────────────────────────────────────────────

describe('validateFraming', () => {
  it('rejects empty, em-dash, generic praise, exclamation points, and overly long text', () => {
    expect(validateFraming(null)).toBe(false)
    expect(validateFraming('')).toBe(false)
    expect(validateFraming('   ')).toBe(false)
    expect(validateFraming('I notice you mentioned the coast — and the move.')).toBe(false)
    expect(validateFraming('You are so thoughtful about this.')).toBe(false)
    expect(validateFraming('I notice this!')).toBe(false)
    expect(validateFraming('a'.repeat(401))).toBe(false)
  })

  it('accepts a tentative, grounded, plain sentence', () => {
    expect(validateFraming('I have been thinking about the move you mentioned to the coast.')).toBe(true)
  })
})

// ── End-to-end P2/P3 happy paths ────────────────────────────────────────────

describe('selectNextQuestion end-to-end (P2/P3)', () => {
  it('selects a standard b2c question, applies framing when an anchor deposit exists, and records history', async () => {
    const D1 = 1, D2 = 2
    const Q1 = 101

    const coverage: DomainCoverage[] = [
      domain({ domainId: D1, emotionalWeight: 1, density: 1 }),
      domain({ domainId: D2, emotionalWeight: 1, density: 10 }),
    ]
    const bank: ElicitationQuestion[] = [
      { id: Q1, domainId: D1, tier: 'standard', questionText: 'Tell me about your first job.' },
    ]
    const anchor: AnchorDeposit = { id: 'dep-1', prompt: 'p', response: 'I worked at the docks for ten years.' }

    const deps = makeDeps({
      getOwnerDepositCount:    vi.fn().mockResolvedValue(50), // P2
      getCoverage:             vi.fn().mockResolvedValue(coverage),
      getElicitationQuestions: vi.fn().mockResolvedValue(bank),
      getAnchorDeposit:        vi.fn().mockResolvedValue(anchor),
      generateFramingSentence: vi.fn().mockResolvedValue('I have been thinking about the years you spent at the docks.'),
      random: () => 0,
    })

    const result = await selectNextQuestion({ archiveId: 'arch-1', channel: 'daily_email', now: NOW }, deps)

    expect(result.source).toBe('p2')
    expect(result.domainId).toBe(D1)
    expect(result.questionId).toBe(Q1)
    expect(result.questionText).toBe('Tell me about your first job.')
    expect(result.framingUsed).toContain('docks')
    expect(deps.insertQuestionHistory).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'p2', domainId: D1, questionId: Q1, archiveId: 'arch-1' }),
    )
  })

  it('falls back to a bare question when framing fails validation', async () => {
    const D1 = 1
    const Q1 = 101

    const coverage: DomainCoverage[] = [domain({ domainId: D1, emotionalWeight: 1, density: 1 })]
    const bank: ElicitationQuestion[] = [
      { id: Q1, domainId: D1, tier: 'standard', questionText: 'Tell me about your first job.' },
    ]
    const anchor: AnchorDeposit = { id: 'dep-1', prompt: 'p', response: 'I worked at the docks.' }

    const deps = makeDeps({
      getOwnerDepositCount:    vi.fn().mockResolvedValue(50),
      getCoverage:             vi.fn().mockResolvedValue(coverage),
      getElicitationQuestions: vi.fn().mockResolvedValue(bank),
      getAnchorDeposit:        vi.fn().mockResolvedValue(anchor),
      generateFramingSentence: vi.fn().mockResolvedValue('You are so wonderful and thoughtful!'), // invalid
      random: () => 0,
    })

    const result = await selectNextQuestion({ archiveId: 'arch-1', channel: 'app_spark', now: NOW }, deps)
    expect(result.framingUsed).toBeNull()
    expect(result.questionText).toBe('Tell me about your first job.')
  })

  it('uses b2b_questions for succession-tier archives, ordered by order_index', async () => {
    const D1 = 1

    const coverage: DomainCoverage[] = [domain({ domainId: D1, emotionalWeight: 1, density: 1 })]
    const b2bBank: B2BQuestion[] = [
      { id: 'b2', domainId: D1, question: 'Second question', orderIndex: 2 },
      { id: 'b1', domainId: D1, question: 'First question', orderIndex: 1 },
    ]

    const deps = makeDeps({
      getArchiveScope:      vi.fn().mockResolvedValue('b2b'),
      getOwnerDepositCount: vi.fn().mockResolvedValue(250), // P3
      getCoverage:          vi.fn().mockResolvedValue(coverage),
      getB2BQuestions:      vi.fn().mockResolvedValue(b2bBank),
      random: () => 0,
    })

    const result = await selectNextQuestion({ archiveId: 'arch-2', channel: 'daily_email', now: NOW }, deps)
    expect(result.source).toBe('p3')
    expect(result.b2bQuestionId).toBe('b1')
    expect(result.questionText).toBe('First question')
  })

  it('never generates framing for P1 (pre-Echo)', async () => {
    const D1 = 1, D2 = 2, D3 = 3
    const Q1 = 101

    const coverage: DomainCoverage[] = [
      domain({ domainId: D1, emotionalWeight: 1, density: 1 }),
      domain({ domainId: D2, emotionalWeight: 1, density: 2 }),
      domain({ domainId: D3, emotionalWeight: 1, density: 3 }),
    ]
    const bank: ElicitationQuestion[] = [
      { id: Q1, domainId: D1, tier: 'onramp', questionText: 'Onramp question' },
    ]

    const deps = makeDeps({
      getOwnerDepositCount:    vi.fn().mockResolvedValue(3), // P1
      getCoverage:             vi.fn().mockResolvedValue(coverage),
      getElicitationQuestions: vi.fn().mockResolvedValue(bank),
      generateFramingSentence: vi.fn(),
    })

    const result = await selectNextQuestion({ archiveId: 'arch-1', channel: 'daily_email', now: NOW }, deps)
    expect(result.source).toBe('p1')
    expect(result.framingUsed).toBeNull()
    expect(deps.generateFramingSentence).not.toHaveBeenCalled()
  })
})
