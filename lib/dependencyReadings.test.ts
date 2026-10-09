import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { B2B_DOMAINS } from './b2bDomains'
import { COVERAGE_PROBES, PROBE_SET_VERSION } from './coverageProbes'
import type { CoverageRunResult, RunStep } from './coverageRun'
import type { ProbeResult } from './coverage'
import type { AreaCallRow } from './assessment'
import { allRoundPrompts, roundFor } from './assessmentRound'
import {
  prefixedStep,
  runDependencyReadings,
  type ReadingsDeps,
  type ReadingsReportRow,
  type ReadyPatch,
} from './dependencyReadings'

const DOMAINS = B2B_DOMAINS.map(d => d.name)
const REPORT_ID = 'report-1'
const ARCHIVE_ID = 'arch-1'

/**
 * Inngest's step.run, as far as this job depends on it: a step is run once per
 * id and its result is handed back on every later call with that id.
 */
function memoStep(): { step: RunStep; ids: string[]; executed: string[] } {
  const memo = new Map<string, unknown>()
  const ids: string[] = []
  const executed: string[] = []
  const step: RunStep = async <T,>(id: string, fn: () => Promise<T>) => {
    ids.push(id)
    if (memo.has(id)) return memo.get(id) as T
    executed.push(id)
    const out = await fn()
    memo.set(id, out)
    return out
  }
  return { step, ids, executed }
}

/**
 * A stand in for runCoverage with the same three step ids the real one uses
 * ('open-run', 'probe:<key>', 'roll-up'; pinned against the source below).
 * Each real execution opens a new run id and reads `deposits` questions per
 * domain as grounded, so a second execution is visibly a second reading.
 */
function fakeCoverage(opts: { depositsPerRun?: number[]; dropProbe?: boolean; offLabel?: boolean } = {}) {
  const state = { opened: 0, probes: 0 }
  const run: ReadingsDeps['run'] = async ({ runStep }) => {
    const opened = await runStep('open-run', async () => {
      state.opened += 1
      return { runId: `run-${state.opened}`, n: state.opened }
    })
    const deposits = opts.depositsPerRun?.[opened.n - 1] ?? 2
    const seen: Record<string, number> = {}
    const results: ProbeResult[] = []
    for (const probe of COVERAGE_PROBES) {
      const i = (seen[probe.domain] = (seen[probe.domain] ?? 0) + 1)
      const out = await runStep(`probe:${probe.key}`, async () => {
        state.probes += 1
        return { basis: i <= deposits ? ('deposit' as const) : ('no_position' as const), errored: false }
      })
      results.push({ probeKey: probe.key, domain: probe.domain, basis: out.basis, verifierErrored: out.errored })
    }
    return runStep('roll-up', async (): Promise<CoverageRunResult> => ({
      runId:   opened.runId,
      ok:      true,
      complete: true,
      offLabel: opts.offLabel ?? false,
      error:   null,
      rollups: [],
      results: opts.dropProbe ? results.slice(1) : results,
      retrievalCalls: 0,
      retrievalFallbacks: 0,
    }))
  }
  return { run, state }
}

function areaRows(areas: string[] = DOMAINS): AreaCallRow[] {
  return areas.map(area => ({
    status: 'complete',
    state:  { areaCall: { area, scope: 'business' }, probeHistory: [{ depositId: `dep-${area}` }] },
  }))
}

function intake(): unknown {
  return DOMAINS.map((domain, i) => ({ domain, answer: i % 2 === 0 ? 'founder' : 'delegated', role: 'Operations lead' }))
}

function harness(over: {
  row?:     Partial<ReadingsReportRow> | null
  archive?: { tier: string | null; status: string | null } | null
  areas?:   string[]
  /** Prompts of the round deposits on the record. Defaults to every round, all answered. */
  rounds?:  string[]
  run?:     ReadingsDeps['run']
  saved?:   boolean
  step?:    RunStep
} = {}) {
  const memo = memoStep()
  const saves: { id: string; patch: ReadyPatch }[] = []
  const notices: string[] = []
  const cov = fakeCoverage()
  let runCalls = 0
  const inner = over.run ?? cov.run
  const deps: ReadingsDeps = {
    loadReport:   async () => over.row === null ? null : { id: REPORT_ID, archive_id: ARCHIVE_ID, status: 'capturing', intake: intake(), ...over.row },
    loadArchive:  async () => over.archive === undefined ? { tier: 'succession', status: 'assessment' } : over.archive,
    loadAreaRows: async () => areaRows(over.areas),
    loadRoundPrompts: async () => over.rounds ?? allRoundPrompts(),
    run:          async params => { runCalls += 1; return inner(params) },
    saveReady:    async (id, patch) => { saves.push({ id, patch }); return over.saved ?? true },
    notify:       async n => { notices.push(n.subject) },
    step:         over.step ?? memo.step,
    now:          () => new Date('2026-10-08T18:00:00.000Z'),
  }
  return { deps, memo, saves, notices, cov, runCalls: () => runCalls }
}

describe('the step prefix', () => {
  it('names the hazard: the same step function twice hands the second run the first run’s results', async () => {
    const { step, executed } = memoStep()
    const { run, state } = fakeCoverage()
    const a = await run({ archiveId: ARCHIVE_ID, triggerSource: 'manual', runStep: step })
    const b = await run({ archiveId: ARCHIVE_ID, triggerSource: 'manual', runStep: step })
    if ('skipped' in a || 'skipped' in b) throw new Error('unexpected skip')
    expect(b.runId).toBe(a.runId)
    expect(state.opened).toBe(1)
    expect(state.probes).toBe(COVERAGE_PROBES.length)
    expect(executed).toHaveLength(COVERAGE_PROBES.length + 2)
  })

  it('gives each run its own ids, so the second is a second reading', async () => {
    const { step, executed } = memoStep()
    const { run, state } = fakeCoverage()
    const a = await run({ archiveId: ARCHIVE_ID, triggerSource: 'manual', runStep: prefixedStep(step, 'a') })
    const b = await run({ archiveId: ARCHIVE_ID, triggerSource: 'manual', runStep: prefixedStep(step, 'b') })
    if ('skipped' in a || 'skipped' in b) throw new Error('unexpected skip')
    expect(a.runId).toBe('run-1')
    expect(b.runId).toBe('run-2')
    expect(state.probes).toBe(COVERAGE_PROBES.length * 2)
    expect(executed.filter(id => id.startsWith('a:'))).toHaveLength(COVERAGE_PROBES.length + 2)
    expect(executed.filter(id => id.startsWith('b:'))).toHaveLength(COVERAGE_PROBES.length + 2)
  })

  it('covers every step runCoverage takes: the real ids are the three the stand in uses', () => {
    const source = readFileSync(path.resolve(__dirname, 'coverageRun.ts'), 'utf8')
    const body = source.slice(source.indexOf('export async function runCoverage('))
    const ids = Array.from(body.matchAll(/runStep\(\s*([`'][^`']+[`'])/g)).map(m => m[1])
    expect(ids).toEqual(["'open-run'", '`probe:${probe.key}`', "'roll-up'"])
    // Nothing in the run reaches Inngest except through the injected runStep.
    expect(body).not.toMatch(/\bstep\.run\(/)
  })
})

describe('runDependencyReadings', () => {
  it('takes two readings, builds the report, and stores it once', async () => {
    const h = harness({ run: fakeCoverage({ depositsPerRun: [2, 3] }).run })
    const out = await runDependencyReadings(REPORT_ID, h.deps)

    expect(out.outcome).toBe('ready')
    if (out.outcome !== 'ready') return
    expect(out.runIds).toEqual(['run-1', 'run-2'])
    expect(h.runCalls()).toBe(2)

    expect(h.saves).toHaveLength(1)
    const { id, patch } = h.saves[0]
    expect(id).toBe(REPORT_ID)
    expect(patch.run_a_id).toBe('run-1')
    expect(patch.run_b_id).toBe('run-2')
    expect(patch.probe_set_version).toBe(PROBE_SET_VERSION)
    expect(patch.report_built_at).toBe('2026-10-08T18:00:00.000Z')
    expect(patch.report.available).toBe(true)
    expect(patch.report.runIds).toEqual(['run-1', 'run-2'])
    // The two readings stayed two: 2 of 6 on one, 3 of 6 on the other.
    expect(patch.report.domains[0].readings.map(r => r.deposit)).toEqual([2, 3])
    expect(patch.report.domains[0].readingsAgree).toBe(false)
    // The snapshot survives the trip to a jsonb column and back.
    expect(JSON.parse(JSON.stringify(patch.report))).toEqual(patch.report)

    expect(h.notices).toEqual(['Dependency report ready for the founder'])
    const stepIds = new Set(h.memo.ids)
    expect(stepIds.has('check')).toBe(true)
    expect(stepIds.has('save')).toBe(true)
    expect(stepIds.has('a:open-run')).toBe(true)
    expect(stepIds.has('b:open-run')).toBe(true)
    expect(stepIds.has('open-run')).toBe(false)
  })

  it('spends nothing on a replay: every step is already memoized', async () => {
    const h = harness()
    const first = await runDependencyReadings(REPORT_ID, h.deps)
    const executedOnce = h.memo.executed.length
    const second = await runDependencyReadings(REPORT_ID, h.deps)
    expect(second).toEqual(first)
    expect(h.memo.executed).toHaveLength(executedOnce)
    expect(h.cov.state.opened).toBe(2)
    expect(h.saves).toHaveLength(1)
  })

  it('checks before spending: no run is started unless the record is whole', async () => {
    const cases: [string, Parameters<typeof harness>[0], string][] = [
      ['no row',                 { row: null },                                              'not_found'],
      ['no founder record',      { row: { archive_id: null } },                              'no_record'],
      ['record deleted',         { archive: null },                                          'no_record'],
      ['an active client',       { archive: { tier: 'succession', status: 'active' } },      'not_assessment'],
      ['a personal tier record', { archive: { tier: 'active', status: 'assessment' } },      'not_assessment'],
      ['seven areas',            { areas: DOMAINS.slice(0, 7) },                             'not_due'],
      ['eight calls, no rounds', { rounds: [] },                                             'not_due'],
      ['one round question short', { rounds: allRoundPrompts().slice(1) },                   'not_due'],
      ['seven rounds',           { rounds: DOMAINS.slice(0, 7).flatMap(d => roundFor(d).map(q => q.question)) }, 'not_due'],
      ['no intake',              { row: { intake: null } },                                  'not_due'],
      ['seven answers',          { row: { intake: (intake() as unknown[]).slice(1) } },      'not_due'],
      ['already ready',          { row: { status: 'ready' } },                               'not_due'],
      ['already released',       { row: { status: 'released' } },                            'not_due'],
      ['only ordered',           { row: { status: 'ordered' } },                             'not_due'],
    ]
    for (const [name, over, reason] of cases) {
      const h = harness(over)
      const out = await runDependencyReadings(REPORT_ID, h.deps)
      expect(out.outcome, name).toBe('skipped')
      if (out.outcome === 'skipped') expect(out.reason, name).toBe(reason)
      expect(h.runCalls(), name).toBe(0)
      expect(h.saves, name).toHaveLength(0)
      expect(h.notices, name).toHaveLength(0)
    }
  })

  it('refuses to build from one run returned twice, whatever caused it', async () => {
    const one = fakeCoverage()
    const shared = memoStep().step
    // A run that ignores the step it is handed and uses one of its own.
    const h = harness({ run: params => one.run({ ...params, runStep: shared }) })
    const out = await runDependencyReadings(REPORT_ID, h.deps)
    expect(out.outcome).toBe('stopped')
    if (out.outcome === 'stopped') {
      expect(out.reason).toBe('same_run')
      expect(out.runIds).toEqual(['run-1', 'run-1'])
    }
    expect(h.saves).toHaveLength(0)
    expect(h.notices).toEqual(['Dependency report: both readings were the same run'])
  })

  it('stops when a reading is refused, and says which', async () => {
    const cov = fakeCoverage()
    let n = 0
    const h = harness({
      run: async params => (++n === 2 ? { skipped: 'run run-9 already in flight' } : cov.run(params)),
    })
    const out = await runDependencyReadings(REPORT_ID, h.deps)
    expect(out).toEqual({
      outcome: 'stopped',
      reason:  'run_refused',
      detail:  ['reading b: run run-9 already in flight'],
      runIds:  ['run-1'],
    })
    expect(h.saves).toHaveLength(0)
    expect(h.notices).toEqual(['Dependency report: a reading was refused'])
  })

  it('stores nothing when a run is missing a probe or was read off label', async () => {
    const short = harness({ run: fakeCoverage({ dropProbe: true }).run })
    const a = await runDependencyReadings(REPORT_ID, short.deps)
    expect(a.outcome).toBe('stopped')
    if (a.outcome === 'stopped') expect(a.reason).toBe('run_incomplete')
    expect(short.saves).toHaveLength(0)
    expect(short.notices).toEqual(['Dependency report: could not be built (run_incomplete)'])

    const off = harness({ run: fakeCoverage({ offLabel: true }).run })
    const b = await runDependencyReadings(REPORT_ID, off.deps)
    expect(b.outcome).toBe('stopped')
    if (b.outcome === 'stopped') expect(b.reason).toBe('run_mismatch')
    expect(off.saves).toHaveLength(0)
  })

  it('does not announce a report the row would not take', async () => {
    const h = harness({ saved: false })
    const out = await runDependencyReadings(REPORT_ID, h.deps)
    expect(out).toEqual({ outcome: 'superseded', runIds: ['run-1', 'run-2'] })
    expect(h.saves).toHaveLength(1)
    expect(h.notices).toHaveLength(0)
  })
})
