/**
 * Frozen layer selection, lib/frozenLayer.ts.
 *
 * Three claims worth checking rather than asserting:
 *
 * 1. NEUTRALITY UNDER THE CAP. A corpus at or under FROZEN_LAYER_LIMIT is sent
 *    whole, in the order given, with no model call. This is what keeps the
 *    fifteen-pair fixtures and the registered G7 arms byte-identical to every
 *    run before 2026-09-10.
 *
 * 2. THE RETRIEVER CHOOSES, QUALITY FILLS, QUALITY ORDERS. Over the cap, the
 *    retriever's picks are kept, the layer is filled to the cap with the
 *    highest quality unpicked pairs, and the result is presented in candidate
 *    (quality) order regardless of how the retriever ranked them.
 *
 * 3. FAILURE DEGRADES TO YESTERDAY. A thrown call or an unreadable reply
 *    produces the pre-2026-09-10 layer (quality order, top of the cap), says
 *    so in `method`, and never throws.
 *
 * Nothing here reaches Anthropic. The client is a fake passed in.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  selectFrozenLayer, parseRetrievalSelection, composeFrozenLayer, renderCandidateList,
  retrievalDisabledByEnv, RETRIEVAL_ENV_VAR, RETRIEVAL_TIMEOUT_MS, RETRIEVAL_MAX_RETRIES,
  FROZEN_LAYER_LIMIT, RETRIEVAL_MODEL, type FrozenLayerCandidate, type RetrievalClient,
} from './frozenLayer'

function candidates(n: number): FrozenLayerCandidate[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `pair-${i}`, prompt: `question ${i}`, completion: `answer ${i}`,
  }))
}

/** A fake client that answers with the given text and records what it was sent. */
function fakeClient(reply: string | Error) {
  // The parameters are declared so `create.mock.calls[0]` is typed as the
  // (params, options) pair; they are read there, not here.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const create = vi.fn(async (params: unknown, options?: unknown) => {
    if (reply instanceof Error) throw reply
    return { content: [{ type: 'text', text: reply }] }
  })
  const client = { messages: { create } } as unknown as RetrievalClient
  return { client, create }
}

describe('selectFrozenLayer under the cap', () => {
  it('sends every pair, in order, with no model call', async () => {
    const c = candidates(FROZEN_LAYER_LIMIT)
    const { client, create } = fakeClient('{"selected":[1]}')

    const s = await selectFrozenLayer({ question: 'anything', candidates: c, client })

    console.log(`  ${c.length} candidates, cap ${FROZEN_LAYER_LIMIT}: method ${s.method}, calls ${create.mock.calls.length}`)
    expect(s.method).toBe('all')
    expect(s.pairs).toEqual(c)
    expect(s.retrievalCalled).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })

  it('treats an empty corpus the same way', async () => {
    const { client, create } = fakeClient('{"selected":[]}')
    const s = await selectFrozenLayer({ question: 'q', candidates: [], client })
    expect(s.method).toBe('all')
    expect(s.pairs).toEqual([])
    expect(create).not.toHaveBeenCalled()
  })
})

describe('selectFrozenLayer over the cap', () => {
  it('keeps the retriever picks, fills to the cap by quality, presents in quality order', async () => {
    const c = candidates(30)
    // The retriever ranks three low-quality pairs above everything else.
    const { client, create } = fakeClient('{"selected":[29, 25, 22]}')

    const s = await selectFrozenLayer({ question: 'how do you allocate capital', candidates: c, client })

    console.log(`  30 candidates, picks [29,25,22] (1-based): method ${s.method}, layer ${s.pairs.length}`)
    console.log(`  layer ids: ${s.pairs.map(p => p.id).join(' ')}`)

    expect(s.method).toBe('retrieved')
    expect(s.retrievalCalled).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    expect(s.pairs.length).toBe(FROZEN_LAYER_LIMIT)
    // 0-based positions of the picks, and their ids in the same order.
    expect(s.retrievedIndexes).toEqual([28, 24, 21])
    expect(s.retrievedIds).toEqual(['pair-28', 'pair-24', 'pair-21'])
    // Picks are in; the filler is the top 17 by quality.
    const ids = s.pairs.map(p => p.id)
    expect(ids).toContain('pair-28')
    expect(ids).toContain('pair-24')
    expect(ids).toContain('pair-21')
    for (let i = 0; i < 17; i++) expect(ids).toContain(`pair-${i}`)
    // Quality order, not retriever order.
    const positions = s.pairs.map(p => Number(p.id!.replace('pair-', '')))
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('sends the question, the numbered list, the limit, and the model in the request', async () => {
    const c = candidates(25)
    const { client, create } = fakeClient('{"selected":[3]}')

    await selectFrozenLayer({
      question: 'who do you trust to tell you a deal is bad',
      priorQuestions: ['first question', 'second question', 'third question'],
      candidates: c, client,
    })

    const req = create.mock.calls[0][0] as unknown as {
      model: string; temperature: number
      system: { type: string; text: string; cache_control?: unknown }[]
      messages: { role: string; content: string }[]
    }
    console.log(`  request model ${req.model}, temperature ${req.temperature}, system blocks ${req.system.length}`)

    expect(req.model).toBe(RETRIEVAL_MODEL)
    expect(req.temperature).toBe(0)
    // The call is bounded. The SDK default is ten minutes with two retries.
    expect(create.mock.calls[0][1]).toEqual({ timeout: RETRIEVAL_TIMEOUT_MS, maxRetries: RETRIEVAL_MAX_RETRIES })
    expect(req.system[1].text).toContain(renderCandidateList(c))
    expect(req.system[1].cache_control).toEqual({ type: 'ephemeral' })
    expect(req.messages[0].content).toContain('who do you trust to tell you a deal is bad')
    expect(req.messages[0].content).toContain(`LIMIT: ${FROZEN_LAYER_LIMIT}`)
    // Only the last two prior turns ride along.
    expect(req.messages[0].content).toContain('second question')
    expect(req.messages[0].content).toContain('third question')
    expect(req.messages[0].content).not.toContain('first question')
  })

  it('an empty pick list still yields a full layer, by quality', async () => {
    const c = candidates(40)
    const { client } = fakeClient('{"selected":[]}')

    const s = await selectFrozenLayer({ question: 'q', candidates: c, client })

    expect(s.method).toBe('retrieved')
    expect(s.retrievedIndexes).toEqual([])
    expect(s.pairs).toEqual(c.slice(0, FROZEN_LAYER_LIMIT))
  })

  it('respects a caller-supplied limit', async () => {
    const c = candidates(12)
    const { client } = fakeClient('{"selected":[12, 11]}')

    const s = await selectFrozenLayer({ question: 'q', candidates: c, client, limit: 5 })

    expect(s.pairs.length).toBe(5)
    expect(s.pairs.map(p => p.id)).toEqual(['pair-0', 'pair-1', 'pair-2', 'pair-10', 'pair-11'])
  })
})

describe('selectFrozenLayer failure posture', () => {
  it('a thrown call degrades to quality order and says so', async () => {
    const c = candidates(30)
    const { client } = fakeClient(new Error('ECONNRESET'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const s = await selectFrozenLayer({ question: 'q', candidates: c, client })
    warn.mockRestore()

    console.log(`  thrown call: method ${s.method}, error "${s.error}"`)
    expect(s.method).toBe('fallback_quality')
    expect(s.retrievalCalled).toBe(true)
    expect(s.error).toContain('ECONNRESET')
    expect(s.pairs).toEqual(c.slice(0, FROZEN_LAYER_LIMIT))
  })

  it('an unreadable reply degrades the same way', async () => {
    const c = candidates(30)
    const { client } = fakeClient('Sure! Here are some thoughts about the deposits.')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const s = await selectFrozenLayer({ question: 'q', candidates: c, client })
    warn.mockRestore()

    expect(s.method).toBe('fallback_quality')
    expect(s.pairs).toEqual(c.slice(0, FROZEN_LAYER_LIMIT))
  })

  it('an empty question over the cap makes no call and degrades', async () => {
    const c = candidates(30)
    const { client, create } = fakeClient('{"selected":[1]}')

    const s = await selectFrozenLayer({ question: '   ', candidates: c, client })

    expect(s.method).toBe('fallback_quality')
    expect(s.retrievalCalled).toBe(false)
    expect(create).not.toHaveBeenCalled()
    expect(s.pairs).toEqual(c.slice(0, FROZEN_LAYER_LIMIT))
  })
})

describe('the environment switch', () => {
  it('reads only the literal off, case-insensitively', () => {
    expect(retrievalDisabledByEnv({})).toBe(false)
    expect(retrievalDisabledByEnv({ [RETRIEVAL_ENV_VAR]: 'on' })).toBe(false)
    expect(retrievalDisabledByEnv({ [RETRIEVAL_ENV_VAR]: 'false' })).toBe(false)
    expect(retrievalDisabledByEnv({ [RETRIEVAL_ENV_VAR]: 'off' })).toBe(true)
    expect(retrievalDisabledByEnv({ [RETRIEVAL_ENV_VAR]: ' OFF ' })).toBe(true)
  })

  it('over the cap with the switch off: no call, quality order, method disabled, no error', async () => {
    const c = candidates(30)
    const { client, create } = fakeClient('{"selected":[30]}')
    vi.stubEnv(RETRIEVAL_ENV_VAR, 'off')
    try {
      const s = await selectFrozenLayer({ question: 'q', candidates: c, client })
      console.log(`  switch off: method ${s.method}, calls ${create.mock.calls.length}`)
      expect(s.method).toBe('disabled')
      expect(s.retrievalCalled).toBe(false)
      expect(s.error).toBeUndefined()
      expect(create).not.toHaveBeenCalled()
      expect(s.pairs).toEqual(c.slice(0, FROZEN_LAYER_LIMIT))
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('under the cap the switch changes nothing', async () => {
    const c = candidates(5)
    const { client } = fakeClient('{"selected":[1]}')
    vi.stubEnv(RETRIEVAL_ENV_VAR, 'off')
    try {
      const s = await selectFrozenLayer({ question: 'q', candidates: c, client })
      expect(s.method).toBe('all')
      expect(s.pairs).toEqual(c)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('parseRetrievalSelection', () => {
  it('reads fenced JSON, drops out-of-range, non-integer, and duplicate entries, keeps order, caps', () => {
    const raw = '```json\n{"selected":[5, 5, 0, 31, 2.5, "7", 1, 9]}\n```'
    const out = parseRetrievalSelection(raw, 30, 3)
    console.log(`  parsed ${JSON.stringify(out)} from ${JSON.stringify(raw)}`)
    // 5 -> 4, 7 -> 6, 1 -> 0; 0 and 31 out of range; 2.5 not an integer; cap 3 stops before 9.
    expect(out).toEqual([4, 6, 0])
  })

  it('returns null when there is no readable selection', () => {
    expect(parseRetrievalSelection('no json here', 10, 5)).toBeNull()
    expect(parseRetrievalSelection('{"picked":[1]}', 10, 5)).toBeNull()
    expect(parseRetrievalSelection('{"selected":"1,2"}', 10, 5)).toBeNull()
    expect(parseRetrievalSelection('{"selected":[1', 10, 5)).toBeNull()
  })
})

describe('composeFrozenLayer', () => {
  it('is pure and never exceeds the limit', () => {
    const c = candidates(10)
    expect(composeFrozenLayer(c, [9, 8, 7, 6, 5, 4, 3], 4).map(p => p.id)).toEqual(['pair-6', 'pair-7', 'pair-8', 'pair-9'])
    expect(composeFrozenLayer(c, [], 3).map(p => p.id)).toEqual(['pair-0', 'pair-1', 'pair-2'])
    expect(composeFrozenLayer(c, [2], 3).map(p => p.id)).toEqual(['pair-0', 'pair-1', 'pair-2'])
  })
})

describe('renderCandidateList', () => {
  it('numbers from 1 and collapses whitespace', () => {
    const list = renderCandidateList([{ prompt: 'a\n\nb', completion: '  c   d ' }])
    console.log(`  ${JSON.stringify(list)}`)
    expect(list).toBe('[1] Q: a b\n    A: c d')
  })
})
