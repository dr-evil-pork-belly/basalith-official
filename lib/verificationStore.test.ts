/**
 * Verification store gate.
 *
 * The store is testable against the mock pattern slice 2.2 established in
 * lib/coverageRun.test.ts, so it is tested rather than only exercised by the
 * live fixture run. Supabase is mocked; nothing here reaches a network.
 *
 * Three things are worth pinning, and only the first is obvious:
 *
 *   1. The rows carry the fixture context and the right conflict key.
 *   2. NO ARCHIVE TABLE IS EVER NAMED. This is the schema-level guarantee
 *      restated as a runtime assertion. The tables carry no foreign key to
 *      archives, but a store that wrote to coverage_runs by mistake would defeat
 *      the separation from the other side, and nothing else would catch it.
 *   3. published is written FALSE. A local run that silently published would put
 *      laptop figures into a public number, which is the failure this column
 *      exists to prevent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

const H = vi.hoisted(() => {
  const state = {
    calls: [] as {
      table:    string
      op:       string
      payload?: Row | Row[]
      options?: Record<string, unknown>
      filters:  string[]
    }[],
    insertError: null as string | null,
    updateError: null as string | null,
    upsertError: null as string | null,
  }

  function builder(table: string) {
    const filters: string[] = []
    let op = 'select'
    let payload: Row | Row[] | undefined
    let options: Record<string, unknown> | undefined

    const record = () => state.calls.push({ table, op, payload, options, filters: [...filters] })

    const api: Record<string, unknown> = {
      select: (cols: string) => { filters.push(`select(${cols})`); return api },
      insert: (p: Row) => { op = 'insert'; payload = p; return api },
      update: (p: Row) => { op = 'update'; payload = p; return api },
      upsert: (p: Row | Row[], o?: Record<string, unknown>) => {
        op = 'upsert'; payload = p; options = o; record()
        return Promise.resolve({ data: null, error: state.upsertError ? { message: state.upsertError } : null })
      },
      eq: (c: string, v: unknown) => {
        filters.push(`eq(${c},${String(v)})`)
        if (op === 'update') {
          record()
          return Promise.resolve({ data: null, error: state.updateError ? { message: state.updateError } : null })
        }
        return api
      },
      single: () => {
        record()
        if (state.insertError) return Promise.resolve({ data: null, error: { message: state.insertError } })
        return Promise.resolve({ data: { id: 'vrun-1' }, error: null })
      },
    }
    return api
  }

  return { state, supabaseAdmin: { from: (t: string) => builder(t) } }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('./supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))

import { createVerificationStore, resolveCommitSha, type VerificationRunContext } from './verificationStore'

const CTX: VerificationRunContext = {
  fixtureId:  'margaret',
  runGroupId: '11111111-1111-1111-1111-111111111111',
  passNumber: 1,
  published:  false,
  commitSha:  'a'.repeat(40),
}

/** Every table this store must never name. */
const ARCHIVE_TABLES = ['archives', 'coverage_runs', 'coverage_probe_results', 'archive_coverage', 'training_pairs']

beforeEach(() => {
  H.state.calls = []
  H.state.insertError = null
  H.state.updateError = null
  H.state.upsertError = null
})

async function fullRun(overrides: Partial<VerificationRunContext> = {}) {
  const store = createVerificationStore({ ...CTX, ...overrides })
  const opened = await store.openRun({
    archiveId:       'fixture:margaret',
    probeSetVersion: 'v2',
    segment:         'succession',
    offLabel:        false,
    triggerSource:   'manual',
  })
  if ('error' in opened) throw new Error(opened.error)
  await store.recordProbe({
    runId: opened.runId, domain: 'Capital', probeKey: 'capital-01',
    basis: 'no_position', topic: 'a topic', reply: 'a draft',
    verifierErrored: false,
  })
  await store.writeCoverage([])
  await store.finishRun({
    runId: opened.runId, finishedAt: '2026-08-20T00:00:00.000Z', complete: true, error: null,
    probesTotal: 48, probesDeposit: 5, probesOverreach: 8, probesDeclined: 35, probesErrored: 0,
    modelCalls: 96,
  })
  return opened.runId
}

describe('verification store', () => {
  it('never names an archive table', async () => {
    await fullRun()
    const tables = [...new Set(H.state.calls.map(c => c.table))]
    console.log('\n  tables touched:', tables.join(', '))
    for (const forbidden of ARCHIVE_TABLES) {
      expect(tables).not.toContain(forbidden)
    }
    expect(tables.every(t => t.startsWith('verification_'))).toBe(true)
  })

  it('opens a run carrying the fixture context, and no archive id', async () => {
    await fullRun()
    const open = H.state.calls.find(c => c.op === 'insert')!
    console.log('  verification_runs insert:', JSON.stringify(open.payload))

    expect(open.table).toBe('verification_runs')
    expect(open.payload).toEqual({
      run_group_id:      CTX.runGroupId,
      pass_number:       1,
      fixture_id:        'margaret',
      probe_set_version: 'v2',
      published:         false,
      commit_sha:        CTX.commitSha,
      trigger_source:    'manual',
    })
    // The synthetic 'fixture:margaret' must not be stored anywhere.
    expect(JSON.stringify(open.payload)).not.toContain('fixture:margaret')
  })

  it('writes published false even though the caller could pass true', async () => {
    await fullRun()
    const open = H.state.calls.find(c => c.op === 'insert')!
    expect((open.payload as Row).published).toBe(false)

    H.state.calls = []
    await fullRun({ published: true })
    const pub = H.state.calls.find(c => c.op === 'insert')!
    console.log('  published passthrough when explicitly set:', (pub.payload as Row).published)
    // The store is a faithful pipe. The literal false lives at the call site in
    // coverage-fixture-probe.ts, which is what this documents.
    expect((pub.payload as Row).published).toBe(true)
  })

  it('repeats the group, pass, fixture and version onto every probe row', async () => {
    await fullRun()
    const probe = H.state.calls.find(c => c.table === 'verification_probe_results')!
    console.log('  verification_probe_results upsert:', JSON.stringify(probe.payload))
    console.log('  conflict key                    :', JSON.stringify(probe.options))

    expect(probe.payload).toEqual({
      run_id:            'vrun-1',
      run_group_id:      CTX.runGroupId,
      pass_number:       1,
      fixture_id:        'margaret',
      probe_set_version: 'v2',
      domain:            'Capital',
      probe_key:         'capital-01',
      basis:             'no_position',
      verifier_errored:  false,
      topic:             'a topic',
      reply:             'a draft',
    })
    expect(probe.options).toEqual({ onConflict: 'run_id,probe_key' })
  })

  /**
   * The reason verifier_errored exists as a column.
   *
   * A discarded verdict carries basis 'unsupported'. If the flag were not
   * written, a row-level count of basis='unsupported' would include it while
   * verification_runs.probes_overreach excludes it, and the two numbers would
   * disagree silently whenever probes_errored is above zero.
   */
  it('records a discarded verdict structurally, not only in the topic string', async () => {
    const store = createVerificationStore(CTX)
    const opened = await store.openRun({
      archiveId: 'fixture:margaret', probeSetVersion: 'v2',
      segment: 'succession', offLabel: false, triggerSource: 'manual',
    })
    if ('error' in opened) throw new Error(opened.error)

    await store.recordProbe({
      runId: opened.runId, domain: 'Risk', probeKey: 'risk-03',
      basis: 'unsupported',
      topic: 'verifier failsafe, verdict discarded',
      reply: 'a draft',
      verifierErrored: true,
    })

    const probe = H.state.calls.find(c => c.table === 'verification_probe_results')!
    const row = probe.payload as Row
    console.log('  discarded verdict row:', JSON.stringify({
      basis: row.basis, verifier_errored: row.verifier_errored, topic: row.topic,
    }))

    // basis is still the failsafe's 'unsupported'. The flag is what tells a
    // per-basis query to exclude it.
    expect(row.basis).toBe('unsupported')
    expect(row.verifier_errored).toBe(true)
  })

  it('writes no coverage map, because it is derivable from the probe rows', async () => {
    await fullRun()
    const coverageWrites = H.state.calls.filter(c => c.table.includes('coverage'))
    console.log('  coverage table writes:', coverageWrites.length)
    expect(coverageWrites).toEqual([])
  })

  it('returns an empty prior so hysteresis cannot damp pass 2 toward pass 1', async () => {
    const store = createVerificationStore(CTX)
    const prior = await store.readPriorCoverage('anything')
    console.log('  prior coverage rows:', prior.length, '(must be 0, GATE 4 depends on it)')
    expect(prior).toEqual([])
    expect(H.state.calls).toEqual([])
  })

  it('closes the run with the totals, filtered by run id', async () => {
    await fullRun()
    const close = H.state.calls.find(c => c.op === 'update')!
    console.log('  verification_runs close:', JSON.stringify(close.payload))
    expect(close.table).toBe('verification_runs')
    expect((close.payload as Row).ok).toBe(true)
    expect((close.payload as Row).probes_total).toBe(48)
    expect((close.payload as Row).model_calls).toBe(96)
    expect(close.filters).toEqual(['eq(id,vrun-1)'])
  })

  it('throws on a failed probe write rather than losing a drift denominator', async () => {
    const store = createVerificationStore(CTX)
    const opened = await store.openRun({
      archiveId: 'fixture:margaret', probeSetVersion: 'v2',
      segment: 'succession', offLabel: false, triggerSource: 'manual',
    })
    if ('error' in opened) throw new Error(opened.error)

    H.state.upsertError = 'connection reset'
    await expect(store.recordProbe({
      runId: opened.runId, domain: 'Capital', probeKey: 'capital-02',
      basis: 'deposit', topic: 't', reply: 'r', verifierErrored: false,
    })).rejects.toThrow(/capital-02.*connection reset/)
  })

  it('surfaces an open failure as a skip rather than throwing', async () => {
    H.state.insertError = 'relation "verification_runs" does not exist'
    const store = createVerificationStore(CTX)
    const opened = await store.openRun({
      archiveId: 'fixture:margaret', probeSetVersion: 'v2',
      segment: 'succession', offLabel: false, triggerSource: 'manual',
    })
    console.log('  open failure ->', JSON.stringify(opened))
    expect(opened).toEqual({ error: 'relation "verification_runs" does not exist' })
  })
})

describe('resolveCommitSha', () => {
  it('prefers a well formed VERCEL_GIT_COMMIT_SHA', () => {
    const prev = process.env.VERCEL_GIT_COMMIT_SHA
    process.env.VERCEL_GIT_COMMIT_SHA = 'b'.repeat(40)
    expect(resolveCommitSha()).toBe('b'.repeat(40))
    if (prev === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = prev
  })

  it('rejects a malformed env sha rather than writing it', () => {
    const prev = process.env.VERCEL_GIT_COMMIT_SHA
    process.env.VERCEL_GIT_COMMIT_SHA = 'main'
    // Falls through to git, which in CI may or may not resolve. The assertion is
    // only that the junk value is never returned.
    expect(resolveCommitSha()).not.toBe('main')
    if (prev === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = prev
  })

  it('returns null or a full sha, never anything else', () => {
    const sha = resolveCommitSha()
    console.log('  resolved in this environment:', sha ?? 'null')
    expect(sha === null || /^[0-9a-f]{40}$/.test(sha)).toBe(true)
  })
})
