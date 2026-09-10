/**
 * THE SEAM NEUTRALITY GATE.
 *
 * Slice 2.2 put a store port and an injectable content source into
 * lib/coverageRun.ts so scripts/coverage-fixture-probe.ts could stop carrying a
 * forked copy of the probe loop. The whole value of that depends on one claim:
 * WITH BOTH NEW PARAMS ABSENT, THE RUN DOES EXACTLY WHAT IT DID BEFORE.
 *
 * "Extracted rather than rewritten" is a claim worth checking rather than
 * asserting, so this file mocks supabaseAdmin and reads back every table call the
 * default path makes: which tables, in what order, with what payloads, and with
 * what conflict keys.
 *
 * WHY THIS IS A UNIT TEST AND NOT A LIVE BEFORE-AND-AFTER. The obvious gate would
 * be two archive runs with matching probes_* figures. That gate is impossible.
 * Probe basis drift measures 7 of 48 and 6 of 48 across identical runs at the
 * same probe set version, a number this project intends to publish. Two runs of
 * the same archive do not agree with each other, so a live comparison cannot
 * separate "the seam changed behavior" from "the model sampled differently." A
 * live run is still worth doing as a smoke test. It is not evidence of
 * neutrality, and nothing here should be read as making it so.
 *
 * The model and the verifier are mocked. Nothing in this file reaches Anthropic
 * or Supabase.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

const H = vi.hoisted(() => {
  const state = {
    /** Every table call, in the order runCoverage made it. */
    calls: [] as {
      table:    string
      op:       string
      payload?: Row | Row[]
      options?: Record<string, unknown>
      filters:  string[]
    }[],
    archive:  { id: 'arc-1', name: 'Meridian', owner_name: 'Margaret', tier: 'succession' } as Row | null,
    pairs:    [{ prompt: 'p1', completion: 'c1' }] as Row[],
    inFlight: null as Row | null,
    prior:    [] as Row[],
  }

  /**
   * A chainable stub shaped like the PostgREST builder. Every terminal method
   * records the call. Filters are recorded as strings so an assertion can read
   * them without reconstructing the builder.
   */
  function builder(table: string) {
    const filters: string[] = []
    let op = 'select'
    let payload: Row | Row[] | undefined
    let options: Record<string, unknown> | undefined

    const record = () => {
      state.calls.push({ table, op, payload, options, filters: [...filters] })
    }

    const api: Record<string, unknown> = {
      select: (cols: string) => { if (op === 'select') { filters.push(`select(${cols})`) } return api },
      insert: (p: Row) => { op = 'insert'; payload = p; return api },
      upsert: (p: Row | Row[], o?: Record<string, unknown>) => {
        op = 'upsert'; payload = p; options = o; record()
        return Promise.resolve({ data: null, error: null })
      },
      update: (p: Row) => { op = 'update'; payload = p; return api },
      eq: (c: string, v: unknown) => {
        filters.push(`eq(${c},${String(v)})`)
        // update().eq() is terminal on this codebase's usage.
        if (op === 'update') { record(); return Promise.resolve({ data: null, error: null }) }
        // archive_coverage select ends on .eq with no single/maybeSingle.
        if (table === 'archive_coverage' && op === 'select') {
          record(); return Promise.resolve({ data: state.prior, error: null })
        }
        return api
      },
      is: (c: string, v: unknown) => { filters.push(`is(${c},${String(v)})`); return api },
      order: (c: string, o: Record<string, unknown>) => {
        filters.push(`order(${c},${o.ascending ? 'asc' : 'desc'})`); return api
      },
      limit: (n: number) => {
        filters.push(`limit(${n})`)
        record()
        return Promise.resolve({ data: state.pairs, error: null })
      },
      maybeSingle: () => {
        record()
        if (table === 'archives')      return Promise.resolve({ data: state.archive,  error: null })
        if (table === 'coverage_runs') return Promise.resolve({ data: state.inFlight, error: null })
        return Promise.resolve({ data: null, error: null })
      },
      single: () => {
        record()
        return Promise.resolve({ data: { id: 'run-1' }, error: null })
      },
    }
    return api
  }

  const supabaseAdmin = { from: (table: string) => builder(table) }

  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('./supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))

// One deterministic verdict for every probe, so the only thing under test is the
// shape of the store traffic.
vi.mock('./verifyGrounding', () => ({
  verifyGrounding: async () => ({ basis: 'deposit', position: 'a position', topic: 'a topic', supported: true }),
  groundingGapReply: (t: string) => `gap:${t}`,
}))

// Every model call in the run goes through this one class: the voice call from
// coverageRun.ts and, over the cap, the retrieval call from frozenLayer.ts. The
// two are told apart by model, and every call is recorded so a test can count
// them and read the system prompt each probe was sent.
const M = vi.hoisted(() => ({
  calls: [] as { model: string; system: unknown }[],
  /** What the retriever answers. 1-based positions, as the real model returns. */
  retrieverReply: '{"selected":[1]}',
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (params: { model: string; system: unknown }) => {
        M.calls.push({ model: params.model, system: params.system })
        const text = params.model.includes('haiku') ? M.retrieverReply : 'a draft'
        return { content: [{ type: 'text', text }] }
      },
    }
  },
}))

import { runCoverage } from './coverageRun'
import { COVERAGE_PROBES, PROBE_SET_VERSION } from './coverageProbes'
import { B2B_DOMAINS } from './b2bDomains'
import { RETRIEVAL_MODEL, FROZEN_LAYER_CANDIDATE_LIMIT } from './frozenLayer'

const ARCHIVE = 'arc-1'

beforeEach(() => {
  H.state.calls = []
  H.state.archive = { id: ARCHIVE, name: 'Meridian', owner_name: 'Margaret', tier: 'succession' }
  H.state.pairs = [{ prompt: 'p1', completion: 'c1' }]
  H.state.inFlight = null
  H.state.prior = []
  M.calls = []
  M.retrieverReply = '{"selected":[1]}'
})

/** Table calls only, in order, for readable sequence assertions. */
const sequence = () => H.state.calls.map(c => `${c.op} ${c.table}`)

describe('runCoverage default path, store neutrality', () => {
  it('touches exactly the tables the pre-seam implementation touched, in order', async () => {
    const result = await runCoverage({ archiveId: ARCHIVE })

    const seq = sequence()
    const probeWrites = seq.filter(s => s === 'upsert coverage_probe_results')

    // Printed so a reader of the acceptance output can see WHAT was asserted,
    // rather than only that something passed.
    console.log('\n  observed store sequence, default path (both new params absent):')
    console.log(`    1. ${seq[0]}                         archives read, identity`)
    console.log(`    2. ${seq[1]}                    training_pairs read, frozen layer`)
    console.log(`    3. ${seq[2]}                      in-flight check`)
    console.log(`    4. ${seq[3]}                      run row opened`)
    console.log(`    5. ${probeWrites.length} x upsert coverage_probe_results   one per probe`)
    console.log(`    6. ${seq[4 + probeWrites.length]}                  prior coverage read, hysteresis`)
    console.log(`    7. ${seq[5 + probeWrites.length]}                  the map`)
    console.log(`    8. ${seq[6 + probeWrites.length]}                    run row closed`)

    expect(seq[0]).toBe('select archives')
    expect(seq[1]).toBe('select training_pairs')
    expect(seq[2]).toBe('select coverage_runs')
    expect(seq[3]).toBe('insert coverage_runs')
    expect(probeWrites.length).toBe(COVERAGE_PROBES.length)
    expect(seq[4 + probeWrites.length]).toBe('select archive_coverage')
    expect(seq[5 + probeWrites.length]).toBe('upsert archive_coverage')
    expect(seq[6 + probeWrites.length]).toBe('update coverage_runs')
    expect(seq.length).toBe(7 + probeWrites.length)

    expect('skipped' in result).toBe(false)
  })

  it('opens the run row with the same columns and values', async () => {
    await runCoverage({ archiveId: ARCHIVE, triggerSource: 'cron' })

    const open = H.state.calls.find(c => c.op === 'insert' && c.table === 'coverage_runs')!
    console.log('\n  coverage_runs insert payload:', JSON.stringify(open.payload))

    expect(open.payload).toEqual({
      archive_id:        ARCHIVE,
      probe_set_version: PROBE_SET_VERSION,
      segment:           'succession',
      off_label:         false,
      trigger_source:    'cron',
    })
  })

  /**
   * CHANGED 2026-09-10. This test used to pin `select(prompt, completion)` and
   * `limit(20)`: the cap lived in the SQL. Now the read returns the whole
   * included corpus with ids, and the cap is applied per probe by
   * lib/frozenLayer.ts, exactly as the route applies it. The filters and the
   * ordering are what the route sends, which is the claim this pins.
   */
  it('reads the whole included corpus with the same filters and ordering the route uses', async () => {
    await runCoverage({ archiveId: ARCHIVE })

    const pairs = H.state.calls.find(c => c.table === 'training_pairs')!
    console.log('\n  training_pairs read:', pairs.filters.join(' . '))

    expect(pairs.filters).toEqual([
      'select(id, prompt, completion)',
      `eq(archive_id,${ARCHIVE})`,
      'eq(included_in_training,true)',
      'order(quality_score,desc)',
      'order(id,asc)',
      `limit(${FROZEN_LAYER_CANDIDATE_LIMIT})`,
    ])
  })

  it('makes no retrieval call for an archive under the cap', async () => {
    await runCoverage({ archiveId: ARCHIVE })

    const retrievals = M.calls.filter(c => c.model === RETRIEVAL_MODEL)
    console.log(`  model calls ${M.calls.length}, retrieval calls ${retrievals.length}`)

    expect(retrievals.length).toBe(0)
    expect(M.calls.length).toBe(COVERAGE_PROBES.length)
  })

  it('writes each probe result with the same columns and the same conflict key', async () => {
    await runCoverage({ archiveId: ARCHIVE })

    const first = H.state.calls.find(c => c.table === 'coverage_probe_results')!
    console.log('\n  coverage_probe_results upsert payload:', JSON.stringify(first.payload))
    console.log('  coverage_probe_results conflict key  :', JSON.stringify(first.options))

    expect(Object.keys(first.payload as Row).sort()).toEqual(
      ['basis', 'domain', 'probe_key', 'reply', 'run_id', 'topic'],
    )
    expect((first.payload as Row).run_id).toBe('run-1')
    expect(first.options).toEqual({ onConflict: 'run_id,probe_key' })
  })

  /**
   * ProbeRecord gained a required `verifierErrored` in slice 2.3 so the
   * verification tables can record a discarded verdict structurally. This path
   * must be unaffected: coverage_probe_results has no such column, and adding
   * one is a migration against a table holding live archive results, not a side
   * effect of a store change.
   *
   * The key-set assertion above already fails if it appears. This says why, so a
   * future reader does not "fix" the omission.
   */
  it('does not write verifierErrored to coverage_probe_results', async () => {
    await runCoverage({ archiveId: ARCHIVE })

    const first = H.state.calls.find(c => c.table === 'coverage_probe_results')!
    const keys = Object.keys(first.payload as Row)
    console.log('\n  coverage_probe_results keys:', keys.join(', '))

    expect(keys).not.toContain('verifier_errored')
    expect(keys).not.toContain('verifierErrored')
  })

  it('writes the map with the same columns and the same conflict key', async () => {
    await runCoverage({ archiveId: ARCHIVE })

    const cov = H.state.calls.find(c => c.op === 'upsert' && c.table === 'archive_coverage')!
    const rows = cov.payload as Row[]
    console.log('\n  archive_coverage upsert rows        :', rows.length, 'one per live domain')
    console.log('  archive_coverage row 0              :', JSON.stringify(rows[0]))
    console.log('  archive_coverage conflict key       :', JSON.stringify(cov.options))

    expect(rows.length).toBe(B2B_DOMAINS.length)
    expect(Object.keys(rows[0]).sort()).toEqual([
      'archive_id', 'computed_at', 'damped', 'domain', 'last_run_id', 'overreach',
      'probe_set_version', 'probes_declined', 'probes_deposit', 'probes_errored',
      'probes_overreach', 'probes_total', 'state',
    ])
    expect(rows[0].archive_id).toBe(ARCHIVE)
    expect(rows[0].probe_set_version).toBe(PROBE_SET_VERSION)
    expect(rows[0].last_run_id).toBe('run-1')
    expect(cov.options).toEqual({ onConflict: 'archive_id,domain' })
  })

  it('closes the run with the same columns, filtered by run id', async () => {
    await runCoverage({ archiveId: ARCHIVE })

    const close = H.state.calls.find(c => c.op === 'update' && c.table === 'coverage_runs')!
    console.log('\n  coverage_runs close payload:', JSON.stringify(close.payload))
    console.log('  coverage_runs close filter :', close.filters.join(' . '))

    expect(Object.keys(close.payload as Row).sort()).toEqual([
      'complete', 'error', 'finished_at', 'model_calls', 'ok', 'probes_declined',
      'probes_deposit', 'probes_errored', 'probes_overreach', 'probes_total',
    ])
    expect((close.payload as Row).ok).toBe(true)
    expect((close.payload as Row).probes_total).toBe(COVERAGE_PROBES.length)
    expect((close.payload as Row).model_calls).toBe(COVERAGE_PROBES.length * 2)
    expect(close.filters).toEqual(['eq(id,run-1)'])
  })

  it('refuses a second concurrent run and writes nothing', async () => {
    H.state.inFlight = { id: 'run-0' }

    const result = await runCoverage({ archiveId: ARCHIVE })
    console.log('\n  in-flight refusal:', JSON.stringify(result))

    expect(result).toEqual({ skipped: 'run run-0 already in flight' })
    expect(H.state.calls.some(c => c.op === 'insert' || c.op === 'upsert' || c.op === 'update')).toBe(false)
  })

  it('skips a missing archive before opening a run row', async () => {
    H.state.archive = null

    const result = await runCoverage({ archiveId: ARCHIVE })
    console.log('  missing archive  :', JSON.stringify(result))

    expect(result).toEqual({ skipped: 'archive not found' })
    expect(sequence()).toEqual(['select archives'])
  })

  it('derives off_label from segment, not from the caller', async () => {
    H.state.archive = { id: ARCHIVE, name: 'A Family', owner_name: 'Someone', tier: 'active' }

    await runCoverage({ archiveId: ARCHIVE })

    const open = H.state.calls.find(c => c.op === 'insert' && c.table === 'coverage_runs')!
    console.log('  b2c archive open payload:', JSON.stringify(open.payload))

    expect((open.payload as Row).segment).toBe('b2c')
    expect((open.payload as Row).off_label).toBe(true)
  })
})

describe('runCoverage injected path', () => {
  it('reads no archive tables and writes to the injected store only', async () => {
    const { createInMemoryCoverageStore } = await import('./coverageStoreMemory')
    const mem = createInMemoryCoverageStore({ runId: 'mem-run' })

    const result = await runCoverage({
      archiveId: 'fixture:margaret',
      content: {
        ownerName:   'Margaret Chen',
        archiveName: 'the Margaret Chen Archive',
        segment:     'succession',
        pairs:       [{ prompt: 'p', completion: 'c' }],
      },
      store: mem.store,
    })

    console.log('\n  injected path, supabase table calls:', H.state.calls.length)
    console.log('  injected path, store call sequence :',
      mem.calls.map(c => c.method).filter((m, i, a) => m !== a[i - 1]).join(' -> '))

    // The point of the seam: no archive read, no training_pairs read, nothing to Supabase.
    expect(H.state.calls).toEqual([])
    expect(mem.probes.length).toBe(COVERAGE_PROBES.length)
    expect(mem.coverage.length).toBe(B2B_DOMAINS.length)
    expect('skipped' in result).toBe(false)
  })

  /**
   * CHANGED 2026-09-10. This used to assert only that an oversized injected
   * layer still completed, because truncation was array order and there was
   * nothing else to pin. Now an oversized source goes through retrieval per
   * probe, as an archive over the cap does on the route, so there are three
   * things to pin: one retrieval call per probe, a layer at the cap containing
   * the retriever's pick, and the run row counting the extra calls.
   */
  it('selects an oversized injected layer per probe through retrieval, at the cap, and counts the calls', async () => {
    const { createInMemoryCoverageStore } = await import('./coverageStoreMemory')
    const { FROZEN_LAYER_LIMIT } = await import('./coverageRun')
    const mem = createInMemoryCoverageStore()

    const oversized = Array.from({ length: FROZEN_LAYER_LIMIT + 5 }, (_, i) => ({
      prompt: `p${i}`, completion: `c${i}`,
    }))
    // The retriever picks the LAST pair, which quality order alone would drop.
    M.retrieverReply = `{"selected":[${oversized.length}]}`

    const result = await runCoverage({
      archiveId: 'fixture:oversized',
      content: {
        ownerName: 'X', archiveName: 'Y', segment: 'succession', pairs: oversized,
      },
      store: mem.store,
    })

    const retrievals = M.calls.filter(c => c.model === RETRIEVAL_MODEL)
    const voices     = M.calls.filter(c => c.model !== RETRIEVAL_MODEL)
    const lastVoice  = voices[voices.length - 1].system as string
    const layerSize  = (lastVoice.match(/^Q: p\d+$/gm) ?? []).length

    console.log(`  injected ${oversized.length} pairs, cap ${FROZEN_LAYER_LIMIT}: retrieval calls ${retrievals.length}, voice calls ${voices.length}, layer in last prompt ${layerSize}`)

    expect('skipped' in result).toBe(false)
    expect(retrievals.length).toBe(COVERAGE_PROBES.length)
    expect(voices.length).toBe(COVERAGE_PROBES.length)
    expect(layerSize).toBe(FROZEN_LAYER_LIMIT)
    // The retriever's pick is in the layer; the pair it displaced is not.
    expect(lastVoice).toContain(`Q: p${oversized.length - 1}\n`)
    expect(lastVoice).not.toContain(`Q: p${FROZEN_LAYER_LIMIT - 1}\n`)
    // Voice + verifier per probe, plus one retrieval per probe.
    const close = mem.calls.find(c => c.method === 'finishRun')
    expect(close).toBeDefined()
    if (close?.method !== 'finishRun') throw new Error('unreachable')
    expect(close.totals.modelCalls).toBe(COVERAGE_PROBES.length * 3)
    expect(close.totals.error).toBeNull()
    if ('skipped' in result) throw new Error('unreachable')
    expect(result.retrievalCalls).toBe(COVERAGE_PROBES.length)
    expect(result.retrievalFallbacks).toBe(0)
  })

  /**
   * A retrieval that fails measures the pre-2026-09-10 layer. That must be
   * visible on the result AND on the run row, never only in a console warning,
   * or a run of fallbacks reads as a measurement of retrieval.
   */
  it('counts retrieval fallbacks and writes them to the run row error', async () => {
    const { createInMemoryCoverageStore } = await import('./coverageStoreMemory')
    const { FROZEN_LAYER_LIMIT } = await import('./coverageRun')
    const mem = createInMemoryCoverageStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const oversized = Array.from({ length: FROZEN_LAYER_LIMIT + 5 }, (_, i) => ({
      prompt: `p${i}`, completion: `c${i}`,
    }))
    M.retrieverReply = 'not json at all'

    const result = await runCoverage({
      archiveId: 'fixture:fallback',
      content: { ownerName: 'X', archiveName: 'Y', segment: 'succession', pairs: oversized },
      store: mem.store,
    })
    warn.mockRestore()

    if ('skipped' in result) throw new Error('unexpected skip')
    const close = mem.calls.find(c => c.method === 'finishRun')
    if (close?.method !== 'finishRun') throw new Error('unreachable')
    console.log(`  fallbacks ${result.retrievalFallbacks} of ${COVERAGE_PROBES.length}, run row error: "${close.totals.error}"`)

    expect(result.ok).toBe(true)
    expect(result.complete).toBe(true)
    expect(result.retrievalFallbacks).toBe(COVERAGE_PROBES.length)
    expect(close.totals.error).toContain(`retrieval fell back to quality order on ${COVERAGE_PROBES.length} of ${COVERAGE_PROBES.length} probes`)
    // A failed call is still a call, and is still counted.
    expect(close.totals.modelCalls).toBe(COVERAGE_PROBES.length * 3)
    // The layer each probe saw is the quality-order top of the cap.
    const lastVoice = M.calls.filter(c => c.model !== RETRIEVAL_MODEL).pop()!.system as string
    expect(lastVoice).toContain(`Q: p${FROZEN_LAYER_LIMIT - 1}\n`)
    expect(lastVoice).not.toContain(`Q: p${oversized.length - 1}\n`)
  })

  it('returns per-probe detail rich enough to roll up, including verifierErrored', async () => {
    const { createInMemoryCoverageStore } = await import('./coverageStoreMemory')
    const mem = createInMemoryCoverageStore()

    const result = await runCoverage({
      archiveId: 'fixture:shape',
      content: { ownerName: 'X', archiveName: 'Y', segment: 'succession', pairs: [] },
      store: mem.store,
    })

    if ('skipped' in result) throw new Error('unexpected skip')
    console.log('  first ProbeResult:', JSON.stringify(result.results[0]))

    expect(Object.keys(result.results[0]).sort()).toEqual(
      ['basis', 'domain', 'probeKey', 'verifierErrored'],
    )
    expect(result.results.length).toBe(COVERAGE_PROBES.length)
    expect(result.complete).toBe(true)
  })
})
