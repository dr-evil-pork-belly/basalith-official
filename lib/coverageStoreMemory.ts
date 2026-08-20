/**
 * In-memory CoverageStore. Collects rows and discards them.
 *
 * Two callers, and they want the same thing for different reasons:
 *
 *   scripts/coverage-fixture-probe.ts  runs the shipped core against fictional
 *     personas and must write nothing to any table, exactly as it did before the
 *     fork was collapsed.
 *   lib/coverageRun.test.ts  needs to read back what a run asked its store to do.
 *
 * So this records an ordered call log rather than only a final state. A store
 * that keeps just the last write cannot answer "in what order", and order is
 * half of what the neutrality test is checking.
 *
 * Deliberately NOT imported by lib/coverageRun.ts. The production module knows
 * about the port and its Supabase implementation and nothing else, so a test
 * double can never reach a deployed path.
 */

import type {
  CoverageStore,
  CoverageRowWrite,
  OpenRunInput,
  OpenRunOutcome,
  PriorCoverage,
  ProbeRecord,
  RunFailure,
  RunTotals,
} from './coverageRun'

/** One recorded call, in the order runCoverage made it. */
export type StoreCall =
  | { method: 'openRun';           input:     OpenRunInput }
  | { method: 'recordProbe';       record:    ProbeRecord }
  | { method: 'readPriorCoverage'; archiveId: string }
  | { method: 'writeCoverage';     rows:      CoverageRowWrite[] }
  | { method: 'finishRun';         totals:    RunTotals }
  | { method: 'failRun';           failure:   RunFailure }

export type InMemoryCoverageStore = {
  store: CoverageStore
  /** Every call, in order. */
  calls: StoreCall[]
  /** Convenience views over `calls`, for readability at the assertion site. */
  probes:   ProbeRecord[]
  coverage: CoverageRowWrite[]
}

export function createInMemoryCoverageStore(options?: {
  /** Fixed so a test can assert on it. Never generated, so nothing is random. */
  runId?: string
  /**
   * Prior coverage to return. Defaults to none. See the note on readPriorCoverage
   * before setting this to anything.
   */
  prior?: PriorCoverage[]
  /** Force openRun to refuse, to exercise the caller's skip path. */
  openRunError?: string
}): InMemoryCoverageStore {
  const runId = options?.runId ?? 'in-memory-run'
  const calls:    StoreCall[]       = []
  const probes:   ProbeRecord[]     = []
  const coverage: CoverageRowWrite[] = []

  const store: CoverageStore = {
    async openRun(input: OpenRunInput): Promise<OpenRunOutcome> {
      calls.push({ method: 'openRun', input })
      if (options?.openRunError) return { error: options.openRunError }
      return { runId }
    },

    async recordProbe(record: ProbeRecord): Promise<void> {
      calls.push({ method: 'recordProbe', record })
      probes.push(record)
    },

    async readPriorCoverage(archiveId: string): Promise<PriorCoverage[]> {
      calls.push({ method: 'readPriorCoverage', archiveId })

      // EMPTY BY DEFAULT, AND THAT IS A CORRECTNESS REQUIREMENT, NOT A STUB.
      //
      // An empty prior makes previousByDomain empty, which makes
      // applyHysteresis(null, next) return next unchanged. That is exactly what
      // the fixture probe did before the fork was collapsed, so gate behavior is
      // preserved.
      //
      // It must STAY empty for the fixture. GATE 4 asserts that at most one of
      // eight domains changes state across two identical runs, which is the
      // suite's only measurement of whether the map holds still. Feeding run 1's
      // coverage in as run 2's prior would damp run 2 toward run 1 and suppress
      // precisely the movement GATE 4 exists to detect. The gate would then pass
      // because of the damping rather than because the map is stable, which is a
      // check reporting a conclusion it did not reach.
      //
      // If you are here because an unhysteresised fixture path looks like an
      // oversight: it is not. Read GATE 4 in scripts/coverage-fixture-probe.ts
      // before changing this.
      return options?.prior ?? []
    },

    async writeCoverage(rows: CoverageRowWrite[]): Promise<void> {
      calls.push({ method: 'writeCoverage', rows })
      coverage.push(...rows)
    },

    async finishRun(totals: RunTotals): Promise<void> {
      calls.push({ method: 'finishRun', totals })
    },

    async failRun(failure: RunFailure): Promise<void> {
      calls.push({ method: 'failRun', failure })
    },
  }

  return { store, calls, probes, coverage }
}
