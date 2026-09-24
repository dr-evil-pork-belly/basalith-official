import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import {
  parseExtraction,
  findVerbatim,
  normalizeLabel,
  cleanLabel,
  extractThreadsForDeposit,
  buildExtractSystem,
  renderExisting,
  scopeForTier,
  threadExtractionEnabled,
  MAX_THREADS_PER_DEPOSIT,
  type ExtractDeps,
  type ExistingThread,
  type ThreadOp,
} from './threadExtract'

const DEPOSIT =
  'The Riverside job slipped two months in the winter of 2019. I had to decide whether to eat the overrun ' +
  'or go back to the general contractor. My partner Dave wanted to fight it. I called the GC myself.'

const json = (threads: unknown[]) => JSON.stringify({ threads })

describe('findVerbatim', () => {
  it('returns the span exactly as written, tolerant of case and whitespace', () => {
    expect(findVerbatim(DEPOSIT, 'the riverside   job slipped two months')).toBe('The Riverside job slipped two months')
  })

  it('tolerates curly and straight quote marks', () => {
    const text = 'We called it the “good year” because nothing broke.'
    expect(findVerbatim(text, 'called it the "good year" because')).toBe('called it the “good year” because')
  })

  it('returns null when the words are not in the deposit', () => {
    expect(findVerbatim(DEPOSIT, 'the Riverside project ran over budget')).toBeNull()
  })
})

describe('normalizeLabel and cleanLabel', () => {
  it('dedupes articles, possessives, case, and punctuation', () => {
    expect(normalizeLabel('The Riverside job.')).toBe('riverside job')
    expect(normalizeLabel('riverside job')).toBe('riverside job')
    expect(normalizeLabel("My partner Dave's buyout")).toBe('partner daves buyout')
  })

  it('strips em dashes from a model-written label', () => {
    expect(cleanLabel('Riverside \u2014 the overrun')).toBe('Riverside, the overrun')
  })
})

describe('parseExtraction', () => {
  const news = (r: ReturnType<typeof parseExtraction>) =>
    r.ops.filter((o): o is Extract<ThreadOp, { op: 'new' }> => o.op === 'new').map(o => o.thread)

  it('keeps a new thread whose quote is in the deposit and stores the original span', () => {
    const r = parseExtraction(
      json([{ kind: 'project', label: 'The Riverside job', quote: 'the riverside job slipped two months', domain: 'Capital', weight: 2, sensitive: false }]),
      DEPOSIT,
      'business',
    )
    expect(r.parseError).toBeNull()
    expect(news(r)).toHaveLength(1)
    expect(news(r)[0]).toMatchObject({
      kind: 'project', label: 'The Riverside job', labelNorm: 'riverside job',
      domainHint: 'Capital', weight: 2, sensitive: false, quote: 'The Riverside job slipped two months',
    })
  })

  it('drops a thread whose quote the owner never wrote', () => {
    const r = parseExtraction(
      json([{ kind: 'person', label: 'Dave', quote: 'Dave, my business partner of twenty years', weight: 1 }]),
      DEPOSIT,
      'business',
    )
    expect(r.ops).toHaveLength(0)
    expect(r.dropped[0].reason).toBe('quote_not_found')
  })

  it('rejects unknown kinds, long labels, long person labels, and short quotes', () => {
    const r = parseExtraction(
      json([
        { kind: 'value', label: 'Integrity', quote: 'I called the GC myself', weight: 1 },
        { kind: 'event', label: 'one two three four five six seven eight nine', quote: 'I called the GC myself', weight: 1 },
        { kind: 'person', label: 'My partner Dave the fighter', quote: 'My partner Dave wanted to fight it', weight: 1 },
        { kind: 'person', label: 'Dave', quote: 'Dave', weight: 1 },
      ]),
      DEPOSIT,
      'business',
    )
    expect(r.ops).toHaveLength(0)
    expect(r.dropped.map(d => d.reason)).toEqual(['bad_kind', 'label_too_long', 'label_too_long', 'quote_too_short'])
  })

  it('nulls a domain outside the scope taxonomy, and uses the personal names for personal scope', () => {
    const b = parseExtraction(json([{ kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', domain: 'Money', weight: 1 }]), DEPOSIT, 'business')
    expect(news(b)[0].domainHint).toBeNull()
    const p = parseExtraction(json([{ kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', domain: 'Money', weight: 1 }]), DEPOSIT, 'personal')
    expect(news(p)[0].domainHint).toBe('Money')
  })

  it('clamps weight to 1, 2, or 3 and reads sensitive only when exactly true', () => {
    const r = parseExtraction(
      json([
        { kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', weight: 7, sensitive: 'yes' },
        { kind: 'event', label: 'Winter of 2019', quote: 'in the winter of 2019', weight: 3, sensitive: true },
      ]),
      DEPOSIT,
      'business',
    )
    expect(news(r).map(t => [t.weight, t.sensitive])).toEqual([[1, false], [3, true]])
  })

  it('dedupes within a deposit and caps the count', () => {
    const many = Array.from({ length: MAX_THREADS_PER_DEPOSIT + 3 }, (_, i) => ({
      kind: 'event', label: `Thing ${i}`, quote: 'I called the GC myself', weight: 1,
    }))
    many.unshift({ kind: 'event', label: 'thing 0.', quote: 'I called the GC myself', weight: 1 })
    const r = parseExtraction(json(many), DEPOSIT, 'business')
    expect(r.ops).toHaveLength(MAX_THREADS_PER_DEPOSIT)
    expect(r.dropped.some(d => d.reason === 'duplicate')).toBe(true)
    expect(r.dropped.some(d => d.reason === 'over_cap')).toBe(true)
  })

  it('reports unparseable output instead of throwing', () => {
    const r = parseExtraction('not json at all', DEPOSIT, 'business')
    expect(r.ops).toHaveLength(0)
    expect(r.parseError).toMatch(/unparseable/)
  })

  // ── t2: attaching to existing threads ──────────────────────────────────────
  const EXISTING: ExistingThread[] = [
    { id: 'uuid-dave',      kind: 'person',  label: 'Dave',          labelNorm: 'dave' },
    { id: 'uuid-riverside', kind: 'project', label: 'Riverside job', labelNorm: 'riverside job' },
  ]

  it('attaches a mention by the reference the model was shown', () => {
    const r = parseExtraction(
      json([{ match: 'T2', quote: 'The Riverside job slipped two months', weight: 2 }]),
      DEPOSIT, 'business', EXISTING,
    )
    expect(r.ops).toEqual([{
      op: 'attach', threadId: 'uuid-riverside', label: 'Riverside job',
      quote: 'The Riverside job slipped two months', weight: 2, sensitive: false,
    }])
  })

  it('drops a mention of a reference that was never shown', () => {
    const r = parseExtraction(json([{ match: 'T9', quote: 'I called the GC myself', weight: 1 }]), DEPOSIT, 'business', EXISTING)
    expect(r.ops).toHaveLength(0)
    expect(r.dropped[0].reason).toBe('bad_match')
  })

  it('still requires a verbatim quote for a mention', () => {
    const r = parseExtraction(json([{ match: 'T1', quote: 'Dave has always been cautious', weight: 1 }]), DEPOSIT, 'business', EXISTING)
    expect(r.ops).toHaveLength(0)
    expect(r.dropped[0].reason).toBe('quote_not_found')
  })

  it('turns a "new" thread whose label already exists into a mention, decided by code', () => {
    const r = parseExtraction(
      json([{ kind: 'person', label: 'dave', quote: 'My partner Dave wanted to fight it', weight: 1 }]),
      DEPOSIT, 'business', EXISTING,
    )
    expect(r.ops).toEqual([expect.objectContaining({ op: 'attach', threadId: 'uuid-dave' })])
  })

  it('counts a thread once per deposit whether it arrives as a mention or a duplicate new label', () => {
    const r = parseExtraction(
      json([
        { match: 'T1', quote: 'My partner Dave wanted to fight it', weight: 1 },
        { kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', weight: 1 },
      ]),
      DEPOSIT, 'business', EXISTING,
    )
    expect(r.ops).toHaveLength(1)
    expect(r.dropped[0].reason).toBe('duplicate')
  })
})

describe('extractThreadsForDeposit', () => {
  function deps(model: string | Error, existing: ExistingThread[] = []) {
    const calls = { upserts: [] as unknown[], attaches: [] as unknown[], ledger: [] as unknown[], user: '' }
    const d: ExtractDeps = {
      callModel: vi.fn(async (_s: string, user: string) => {
        calls.user = user
        if (model instanceof Error) throw model
        return model
      }),
      loadThreads: vi.fn(async () => existing),
      upsertThread: vi.fn(async row => { calls.upserts.push(row) }),
      attachThread: vi.fn(async row => { calls.attaches.push(row) }),
      recordExtraction: vi.fn(async row => { calls.ledger.push(row) }),
    }
    return { d, calls }
  }
  const input = {
    depositId: 'd1', archiveId: 'a1', tier: 'succession',
    prompt: 'Tell me about a bet.', response: DEPOSIT, saidAt: '2026-06-01T12:00:00Z',
  }

  it('creates new threads, attaches mentions, dates both, and records one ledger row', async () => {
    const { d, calls } = deps(json([
      { kind: 'project', label: 'Riverside job', quote: 'The Riverside job slipped two months', domain: 'Capital', weight: 2 },
      { match: 'T1', quote: 'My partner Dave wanted to fight it', weight: 1 },
      { kind: 'person', label: 'Ghost', quote: 'a person who is not in the text at all', weight: 1 },
    ]), [{ id: 'uuid-dave', kind: 'person', label: 'Dave', labelNorm: 'dave' }])
    const out = await extractThreadsForDeposit(input, d)
    expect(out).toMatchObject({ created: 1, attached: 1, error: null })
    expect(calls.upserts).toEqual([expect.objectContaining({ saidAt: '2026-06-01T12:00:00Z' })])
    expect(calls.attaches).toEqual([expect.objectContaining({ threadId: 'uuid-dave', saidAt: '2026-06-01T12:00:00Z' })])
    expect(calls.ledger).toEqual([{ depositId: 'd1', archiveId: 'a1', threadsFound: 2, error: null }])
  })

  it('shows the model the existing threads by reference, never by id', async () => {
    const { d, calls } = deps(json([]), [{ id: 'uuid-dave', kind: 'person', label: 'Dave', labelNorm: 'dave' }])
    await extractThreadsForDeposit(input, d)
    expect(calls.user).toContain('T1 | person | Dave')
    expect(calls.user).not.toContain('uuid-dave')
  })

  it('records a model failure as an error so the sweep retries it', async () => {
    const { d, calls } = deps(new Error('overloaded'))
    const out = await extractThreadsForDeposit(input, d)
    expect(out.error).toMatch(/overloaded/)
    expect(calls.upserts).toHaveLength(0)
    expect(calls.ledger).toEqual([{ depositId: 'd1', archiveId: 'a1', threadsFound: null, error: 'model: overloaded' }])
  })

  it('records an empty deposit as done with zero threads and never calls the model', async () => {
    const { d, calls } = deps(json([]))
    await extractThreadsForDeposit({ ...input, response: '   ' }, d)
    expect(d.callModel).not.toHaveBeenCalled()
    expect(calls.ledger).toEqual([{ depositId: 'd1', archiveId: 'a1', threadsFound: 0, error: null }])
  })

  it('never takes a quote from the question, only the answer', async () => {
    const { d } = deps(json([{ kind: 'event', label: 'A bet', quote: 'Tell me about a bet', weight: 1 }]))
    const out = await extractThreadsForDeposit(input, d)
    expect(out.created + out.attached).toBe(0)
  })
})

describe('prompt and gates', () => {
  it('lists the scope taxonomy, the closed weight 3 list, and the sensitive rule, with no em dash', () => {
    expect(buildExtractSystem('business')).toContain('Capital')
    expect(buildExtractSystem('personal')).toContain('Money')
    for (const s of [buildExtractSystem('business'), buildExtractSystem('personal')]) {
      expect(s).toMatch(/3 ONLY for a death/)
      expect(s).toMatch(/never 3/)
      expect(s).toMatch(/"sensitive": true when/)
      expect(s).not.toMatch(/\u2014/)
    }
  })

  it('renders an empty existing list explicitly', () => {
    expect(renderExisting([])).toContain('(none yet)')
  })

  it('maps tier to scope', () => {
    expect(scopeForTier('succession')).toBe('business')
    expect(scopeForTier('active')).toBe('personal')
    expect(scopeForTier(null)).toBe('personal')
  })

  it('is off unless THREAD_EXTRACTION is exactly on', () => {
    expect(threadExtractionEnabled({})).toBe(false)
    expect(threadExtractionEnabled({ THREAD_EXTRACTION: 'true' })).toBe(false)
    expect(threadExtractionEnabled({ THREAD_EXTRACTION: 'on' })).toBe(true)
  })
})

// BOUNDARY, decided September 24, 2026, permanent: threads steer questions and
// are never evidence. Nothing the entity answers from, and nothing that judges
// what the entity said, may read them. Asserted on source text, the way
// lib/cronGates.test.ts pins the cron gate.
describe('threads never reach the entity', () => {
  const ROOT = path.resolve(__dirname, '..')
  const EVIDENCE_PATHS = [
    'lib/entitySystemPrompt.ts',
    'lib/entityContext.ts',
    'lib/verifyGrounding.ts',
    'lib/frozenLayer.ts',
    'lib/incidentSaturation.ts',
    'lib/foundingProof.ts',
    'lib/familyEntity.ts',
    'lib/coverageRun.ts',
    'app/api/succession/entity/chat/route.ts',
    'app/api/archive/entity-chat/route.ts',
  ]
  const FORBIDDEN = /record_threads|threadExtract|record_thread_extractions/

  for (const rel of EVIDENCE_PATHS) {
    it(`${rel} does not read threads`, () => {
      const file = path.join(ROOT, rel)
      expect(existsSync(file), `${rel} moved; update this list rather than deleting the check`).toBe(true)
      expect(FORBIDDEN.test(readFileSync(file, 'utf8'))).toBe(false)
    })
  }
})
