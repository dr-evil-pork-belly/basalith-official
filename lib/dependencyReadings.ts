/**
 * Key person dependency report, the two readings. Slice 3a, October 8, 2026.
 *
 * Takes one dependency_reports row from 'capturing' to 'ready': checks the
 * record is whole, runs coverage twice, builds the report
 * (lib/dependencyReport.ts), and stores the snapshot. Everything that touches
 * a database, a model, or Inngest is injected, so this body is tested without
 * any of them and lib/inngest/dependencyFunctions.ts only wires it.
 *
 * WHY THIS IS ITS OWN JOB AND NOT TWO EVENTS. `computeCoverage` runs one at a
 * time and runCoverage refuses a run while one is open on the same record, so
 * two `coverage.run.requested` events sent together produce one run. The two
 * readings are taken here, one after the other, by calling runCoverage
 * directly.
 *
 * THE STEP PREFIX IS THE SAFEGUARD. runCoverage names its steps 'open-run',
 * 'probe:<key>', and 'roll-up'. Inngest memoizes a step by id within one
 * function run. Called twice with the same step function, the second call
 * would be handed the first call's memoized results: no model call, the same
 * run id, and a report whose "two readings" are one reading printed twice.
 * prefixedStep gives each call its own ids ('a:open-run', 'b:open-run'). The
 * body also refuses outright if the two run ids come back equal, so a broken
 * prefix cannot produce a report. lib/dependencyReadings.test.ts pins both.
 *
 * COST. Two model calls per probe, 48 probes, two runs: 192 calls, more when
 * the record is over the frozen layer cap (lib/coverageRun.ts). Nothing is
 * spent until the record and the intake have been checked.
 *
 * WHAT A RUN WRITES. Each run goes through the ordinary coverage store, so
 * coverage_runs, coverage_probe_results, and archive_coverage are written as
 * for any record. The report does not read them back: it is built from the
 * results runCoverage returns, which carry verifierErrored and no hysteresis.
 */

import type { CoverageRunResult, RunStep, TriggerSource } from './coverageRun'
import { PROBE_SET_VERSION } from './coverageProbes'
import { areasCapturedFromRows, isAssessment, readingsDue, type AreaCallRow } from './assessment'
import { validateIntake } from './dependencyIntake'
import { buildDependencyReport, type DependencyReport, type UnavailableReason } from './dependencyReport'

/** The columns of dependency_reports this job reads. */
export interface ReadingsReportRow {
  id:         string
  archive_id: string | null
  status:     string
  intake:     unknown
}

export type BuiltReport = Extract<DependencyReport, { available: true }>

/** What the 'save' step writes, on the row where status is still 'capturing'. */
export interface ReadyPatch {
  report:            BuiltReport
  report_built_at:   string
  run_a_id:          string
  run_b_id:          string
  probe_set_version: string
}

export interface ReadingsDeps {
  loadReport(reportId: string): Promise<ReadingsReportRow | null>
  /** The founder record's tier and status, or null when the row is gone. */
  loadArchive(archiveId: string): Promise<{ tier: string | null; status: string | null } | null>
  loadAreaRows(archiveId: string): Promise<AreaCallRow[]>
  /** lib/coverageRun.ts runCoverage, or a stand in. */
  run(params: { archiveId: string; triggerSource: TriggerSource; runStep: RunStep }): Promise<CoverageRunResult>
  /**
   * Set the row 'ready' with the snapshot. Must be conditional on status =
   * 'capturing' and return whether a row changed, so a second run of this job
   * can never overwrite a report a founder is already looking at.
   */
  saveReady(reportId: string, patch: ReadyPatch): Promise<boolean>
  notify(input: { subject: string; text: string }): Promise<void>
  /** Inngest's step.run, or passThroughStep from lib/coverageRun.ts. */
  step: RunStep
  now?: () => Date
}

export type ReadingsOutcome =
  /** Nothing was spent. The row was not in a state to be read. */
  | { outcome: 'skipped'; reason: 'not_found' | 'no_record' | 'not_assessment' | 'not_due'; detail: string }
  /** Model calls were spent and no report was stored. The founder sees nothing. */
  | { outcome: 'stopped'; reason: 'run_refused' | 'same_run' | UnavailableReason; detail: string[]; runIds: string[] }
  /** A report was built but the row had already left 'capturing'. Not stored. */
  | { outcome: 'superseded'; runIds: [string, string] }
  | { outcome: 'ready'; runIds: [string, string]; headline: string[] }

/**
 * A step must return something JSON carries. A bare notify resolves to
 * undefined, which a replayed step hands back as null; nothing here reads the
 * value, and returning true keeps it that way by construction.
 */
async function notified(deps: ReadingsDeps, input: { subject: string; text: string }): Promise<true> {
  await deps.notify(input)
  return true
}

/** Give one coverage run its own step ids inside a shared Inngest function. */
export function prefixedStep(step: RunStep, prefix: string): RunStep {
  return <T,>(id: string, fn: () => Promise<T>) => step(`${prefix}:${id}`, fn)
}

export async function runDependencyReadings(reportId: string, deps: ReadingsDeps): Promise<ReadingsOutcome> {
  const { step } = deps
  const now = deps.now ?? (() => new Date())

  // ── Check before spending ──────────────────────────────────────────────────
  const checked = await step('check', async () => {
    const row = await deps.loadReport(reportId)
    if (!row) return { ok: false as const, reason: 'not_found' as const, detail: `no dependency_reports row ${reportId}` }
    if (!row.archive_id) return { ok: false as const, reason: 'no_record' as const, detail: 'the report has no founder record' }

    // The business probe set follows tier = 'succession' (lib/coverageSet.ts).
    // Any other tier would be read under the personal set, 96 calls a run, and
    // then refused by buildDependencyReport. Refuse here, before spending.
    const archive = await deps.loadArchive(row.archive_id)
    if (!archive) return { ok: false as const, reason: 'no_record' as const, detail: `founder record ${row.archive_id} not found` }
    if (!isAssessment(archive) || archive.tier !== 'succession') {
      return {
        ok:     false as const,
        reason: 'not_assessment' as const,
        detail: `record ${row.archive_id} has status ${archive.status} and tier ${archive.tier}`,
      }
    }

    const intake   = validateIntake(row.intake)
    const captured = areasCapturedFromRows(await deps.loadAreaRows(row.archive_id))
    if (!readingsDue({ status: row.status, captured, hasIntake: intake.ok })) {
      return {
        ok:     false as const,
        reason: 'not_due' as const,
        detail: `status ${row.status}, ${captured.length} areas captured, intake ${intake.ok ? 'in' : 'missing or incomplete'}`,
      }
    }
    // JSON safe: strings and plain objects only. This crosses a step boundary.
    return { ok: true as const, archiveId: row.archive_id, captured, responses: intake.ok ? intake.responses : [] }
  })

  if (!checked.ok) return { outcome: 'skipped', reason: checked.reason, detail: checked.detail }

  // ── Two readings, one after the other ──────────────────────────────────────
  const runIds: string[] = []
  const readings: Extract<CoverageRunResult, { runId: string }>[] = []
  for (const prefix of ['a', 'b']) {
    const result = await deps.run({
      archiveId:     checked.archiveId,
      // 'manual' is one of the three values coverage_runs.trigger_source allows.
      triggerSource: 'manual',
      runStep:       prefixedStep(step, prefix),
    })
    if ('skipped' in result) {
      await step(`notify-refused:${prefix}`, () => notified(deps, {
        subject: 'Dependency report: a reading was refused',
        text:    [`Report: ${reportId}`, `Reading: ${prefix}`, `Reason: ${result.skipped}`, `Runs so far: ${runIds.join(', ') || 'none'}`].join('\n'),
      }))
      return { outcome: 'stopped', reason: 'run_refused', detail: [`reading ${prefix}: ${result.skipped}`], runIds }
    }
    runIds.push(result.runId)
    readings.push(result)
  }

  const [a, b] = readings
  if (a.runId === b.runId) {
    await step('notify-same-run', () => notified(deps, {
      subject: 'Dependency report: both readings were the same run',
      text:    [`Report: ${reportId}`, `Run: ${a.runId}`, 'The step prefix failed. No report was stored.'].join('\n'),
    }))
    return { outcome: 'stopped', reason: 'same_run', detail: [`both readings returned run ${a.runId}`], runIds }
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  // Pure and deterministic over step results, so it needs no step of its own.
  const report = buildDependencyReport({
    responses:     checked.responses,
    areasCaptured: checked.captured,
    runs: [
      { runId: a.runId, probeSetVersion: versionOf(a), results: a.results },
      { runId: b.runId, probeSetVersion: versionOf(b), results: b.results },
    ],
  })

  if (!report.available) {
    await step('notify-unavailable', () => notified(deps, {
      subject: `Dependency report: could not be built (${report.reason})`,
      text:    [`Report: ${reportId}`, `Runs: ${a.runId}, ${b.runId}`, `Reason: ${report.reason}`, ...report.detail.slice(0, 20)].join('\n'),
    }))
    return { outcome: 'stopped', reason: report.reason, detail: report.detail, runIds }
  }

  // ── Store ──────────────────────────────────────────────────────────────────
  const saved = await step('save', () => deps.saveReady(reportId, {
    report,
    report_built_at:   now().toISOString(),
    run_a_id:          a.runId,
    run_b_id:          b.runId,
    probe_set_version: report.probeSetVersion,
  }))

  if (!saved) return { outcome: 'superseded', runIds: [a.runId, b.runId] }

  await step('notify-ready', () => notified(deps, {
    subject: 'Dependency report ready for the founder',
    text:    [`Report: ${reportId}`, `Runs: ${a.runId}, ${b.runId}`, '', ...report.headline].join('\n'),
  }))

  return { outcome: 'ready', runIds: [a.runId, b.runId], headline: report.headline }
}

/**
 * The probe set a run was taken under. runCoverage does not return the
 * version. The check step has already required tier = 'succession', whose set
 * is the business one, so an on label run is under PROBE_SET_VERSION. An off
 * label run is given a version buildDependencyReport refuses.
 */
function versionOf(run: Extract<CoverageRunResult, { runId: string }>): string {
  return run.offLabel ? 'off-label' : PROBE_SET_VERSION
}
