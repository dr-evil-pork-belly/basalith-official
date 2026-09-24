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
  scopeForTier,
  threadExtractionEnabled,
  MAX_THREADS_PER_DEPOSIT,
  type ExtractDeps,
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
  it('keeps a thread whose quote is in the deposit and stores the original span', () => {
    const r = parseExtraction(
      json([{ kind: 'project', label: 'The Riverside job', quote: 'the riverside job slipped two months', domain: 'Capital', weight: 2 }]),
      DEPOSIT,
      'business',
    )
    expect(r.parseError).toBeNull()
    expect(r.threads).toHaveLength(1)
    expect(r.threads[0]).toMatchObject({
      kind: 'project', label: 'The Riverside job', labelNorm: 'riverside job',
      domainHint: 'Capital', weight: 2, quote: 'The Riverside job slipped two months',
    })
  })

  it('drops a thread whose quote the owner never wrote', () => {
    const r = parseExtraction(
      json([{ kind: 'person', label: 'Dave', quote: 'Dave, my business partner of twenty years', domain: 'People', weight: 1 }]),
      DEPOSIT,
      'business',
    )
    expect(r.threads).toHaveLength(0)
    expect(r.dropped[0].reason).toBe('quote_not_found')
  })

  it('rejects unknown kinds, long labels, and short quotes', () => {
    const r = parseExtraction(
      json([
        { kind: 'value', label: 'Integrity', quote: 'I called the GC myself', weight: 1 },
        { kind: 'event', label: 'one two three four five six seven eight nine', quote: 'I called the GC myself', weight: 1 },
        { kind: 'person', label: 'Dave', quote: 'Dave', weight: 1 },
      ]),
      DEPOSIT,
      'business',
    )
    expect(r.threads).toHaveLength(0)
    expect(r.dropped.map(d => d.reason)).toEqual(['bad_kind', 'label_too_long', 'quote_too_short'])
  })

  it('nulls a domain outside the scope taxonomy, and uses the personal names for personal scope', () => {
    const b = parseExtraction(json([{ kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', domain: 'Money', weight: 1 }]), DEPOSIT, 'business')
    expect(b.threads[0].domainHint).toBeNull()
    const p = parseExtraction(json([{ kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', domain: 'Money', weight: 1 }]), DEPOSIT, 'personal')
    expect(p.threads[0].domainHint).toBe('Money')
  })

  it('clamps weight to 1, 2, or 3, defaulting to 1', () => {
    const r = parseExtraction(
      json([
        { kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', weight: 7 },
        { kind: 'event', label: 'Winter of 2019', quote: 'in the winter of 2019', weight: 3 },
      ]),
      DEPOSIT,
      'business',
    )
    expect(r.threads.map(t => t.weight)).toEqual([1, 3])
  })

  it('dedupes within a deposit and caps the count', () => {
    const many = Array.from({ length: MAX_THREADS_PER_DEPOSIT + 3 }, (_, i) => ({
      kind: 'event', label: `Thing ${i}`, quote: 'I called the GC myself', weight: 1,
    }))
    many.unshift({ kind: 'event', label: 'thing 0.', quote: 'I called the GC myself', weight: 1 })
    const r = parseExtraction(json(many), DEPOSIT, 'business')
    expect(r.threads).toHaveLength(MAX_THREADS_PER_DEPOSIT)
    expect(r.dropped.some(d => d.reason === 'duplicate')).toBe(true)
    expect(r.dropped.some(d => d.reason === 'over_cap')).toBe(true)
  })

  it('reports unparseable output instead of throwing', () => {
    const r = parseExtraction('not json at all', DEPOSIT, 'business')
    expect(r.threads).toHaveLength(0)
    expect(r.parseError).toMatch(/unparseable/)
  })
})

describe('extractThreadsForDeposit', () => {
  function deps(model: string | Error): ExtractDeps & { calls: { upserts: number; ledger: unknown[] } } {
    const calls = { upserts: 0, ledger: [] as unknown[] }
    return {
      calls,
      callModel: vi.fn(async () => { if (model instanceof Error) throw model; return model }),
      upsertThread: vi.fn(async () => { calls.upserts += 1 }),
      recordExtraction: vi.fn(async row => { calls.ledger.push(row) }),
    }
  }
  const input = { depositId: 'd1', archiveId: 'a1', tier: 'succession', prompt: 'Tell me about a bet.', response: DEPOSIT }

  it('upserts each valid thread and records one ledger row with the count', async () => {
    const d = deps(json([
      { kind: 'project', label: 'Riverside job', quote: 'The Riverside job slipped two months', domain: 'Capital', weight: 2 },
      { kind: 'person', label: 'Dave', quote: 'My partner Dave wanted to fight it', domain: 'People', weight: 1 },
      { kind: 'person', label: 'Ghost', quote: 'a person who is not in the text at all', weight: 1 },
    ]))
    const out = await extractThreadsForDeposit(input, d)
    expect(out).toMatchObject({ threadsFound: 2, error: null })
    expect(d.calls.upserts).toBe(2)
    expect(d.calls.ledger).toEqual([{ depositId: 'd1', archiveId: 'a1', threadsFound: 2, error: null }])
  })

  it('records a model failure as an error so the sweep retries it', async () => {
    const d = deps(new Error('overloaded'))
    const out = await extractThreadsForDeposit(input, d)
    expect(out.error).toMatch(/overloaded/)
    expect(d.calls.upserts).toBe(0)
    expect(d.calls.ledger).toEqual([{ depositId: 'd1', archiveId: 'a1', threadsFound: null, error: 'model: overloaded' }])
  })

  it('records an empty deposit as done with zero threads and never calls the model', async () => {
    const d = deps(json([]))
    await extractThreadsForDeposit({ ...input, response: '   ' }, d)
    expect(d.callModel).not.toHaveBeenCalled()
    expect(d.calls.ledger).toEqual([{ depositId: 'd1', archiveId: 'a1', threadsFound: 0, error: null }])
  })

  it('never takes a quote from the question, only the answer', async () => {
    const d = deps(json([{ kind: 'event', label: 'A bet', quote: 'Tell me about a bet', weight: 1 }]))
    const out = await extractThreadsForDeposit(input, d)
    expect(out.threadsFound).toBe(0)
  })
})

describe('prompt and gates', () => {
  it('lists the scope taxonomy in the system prompt and carries no em dash', () => {
    expect(buildExtractSystem('business')).toContain('Capital')
    expect(buildExtractSystem('personal')).toContain('Money')
    for (const s of [buildExtractSystem('business'), buildExtractSystem('personal')]) {
      expect(s).not.toMatch(/\u2014/)
    }
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
