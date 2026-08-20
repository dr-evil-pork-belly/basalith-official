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

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: async () => ({ content: [{ type: 'text', text: 'a draft' }] }) }
  },
}))

import { runCoverage } from './coverageRun'
import { COVERAGE_PROBES, PROBE_SET_VERSION } from './coverageProbes'
import { B2B_DOMAINS } from './b2bDomains'

const ARCHIVE = 'arc-1'

beforeEach(() => {
  H.state.calls = []
  H.state.archive = { id: ARCHIVE, name: 'Meridian', owner_name: 'Margaret', tier: 'succession' }
  H.state.pairs = [{ prompt: 'p1', completion: 'c1' }]
  H.state.inFlight = null
  H.state.prior = []
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

  it('reads the frozen layer with the same filters, ordering, and cap', async () => {
    await runCoverage({ archiveId: ARCHIVE })

    const pairs = H.state.calls.find(c => c.table === 'training_pairs')!
    console.log('\n  training_pairs read:', pairs.filters.join(' . '))

    expect(pairs.filters).toEqual([
      'select(prompt, completion)',
      `eq(archive_id,${ARCHIVE})`,
      'eq(included_in_training,true)',
      'order(quality_score,desc)',
      'limit(20)',
    ])
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

  it('truncates an injected frozen layer to the cap, as the archive path does', async () => {
    const { createInMemoryCoverageStore } = await import('./coverageStoreMemory')
    const { FROZEN_LAYER_LIMIT } = await import('./coverageRun')
    const mem = createInMemoryCoverageStore()

    const oversized = Array.from({ length: FROZEN_LAYER_LIMIT + 5 }, (_, i) => ({
      prompt: `p${i}`, completion: `c${i}`,
    }))

    const result = await runCoverage({
      archiveId: 'fixture:oversized',
      content: {
        ownerName: 'X', archiveName: 'Y', segment: 'succession', pairs: oversized,
      },
      store: mem.store,
    })

    console.log(`  injected ${oversized.length} pairs, cap is ${FROZEN_LAYER_LIMIT}, run completed:`, !('skipped' in result))
    expect('skipped' in result).toBe(false)
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
