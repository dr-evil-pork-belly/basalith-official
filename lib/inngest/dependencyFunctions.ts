/**
 * Key person dependency report, the readings job. Slice 3a, October 8, 2026.
 *
 *   dependency-readings   on event 'dependency.readings.requested'
 *
 * Wiring only. The body is lib/dependencyReadings.ts, which is tested without
 * Inngest or a database; this file supplies the Supabase reads and writes,
 * runCoverage, the internal notice, and step.run.
 *
 * Registered in app/api/inngest/route.ts. The event is sent by
 * requestReadingsIfDue (lib/assessmentStore.ts) when an area call closes or
 * the intake is saved and the record is whole. (Slice 3b, October 8, 2026.)
 *
 * SETTLE. The job waits before it checks. The event is sent from an after()
 * callback in the same request that accepted the founder's last answer, and
 * that answer's training pair is written by another after() callback in the
 * same request (one scoring call). A reading that started at once could miss
 * the last deposit. The wait is a step, so a replay does not repeat it.
 *
 * One at a time across the app. A report is two coverage runs, 192 model
 * calls or more; two reports at once would double that against the same rate
 * limit with nobody waiting on either. A retry replays memoized steps, so it
 * repeats only the work that did not finish.
 *
 * The 'save' write is conditional on status = 'capturing'. That is what stops
 * a second delivery of the event from overwriting a report a founder is
 * already reading: the second run of this job is refused at the 'check' step
 * once the row is 'ready', and if two ever raced past it, only one update
 * finds a row.
 *
 * This job reads archives by id and never selects on status = 'active'. The
 * record it works on has status 'assessment' by design (lib/assessment.ts).
 */

import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runCoverage, type RunStep } from '@/lib/coverageRun'
import { notifyInternal } from '@/lib/internalNotify'
import { runDependencyReadings, type ReadingsReportRow } from '@/lib/dependencyReadings'
import type { AreaCallRow } from '@/lib/assessment'

export const dependencyReadings = inngest.createFunction(
  {
    id:          'dependency-readings',
    name:        'Dependency report, two coverage readings',
    retries:     2,
    concurrency: { limit: 1 },
    triggers:    [{ event: 'dependency.readings.requested' }],
  },
  async ({ event, step }) => {
    const reportId = event.data?.reportId as string | undefined
    if (!reportId) return { outcome: 'skipped' as const, reason: 'no reportId on event' }

    // Same cast, same condition, as computeCoverage in coverageFunctions.ts:
    // Inngest types a step result as Jsonify<T>. Every step in
    // lib/dependencyReadings.ts and lib/coverageRun.ts returns strings,
    // numbers, booleans, nulls, and arrays or plain objects of those, so the
    // two types describe the same runtime value. If a step ever returns a
    // Date, a Map, or undefined, fix the step, never widen the cast.
    const runStep: RunStep = <T,>(id: string, fn: () => Promise<T>) =>
      step.run(id, fn) as Promise<T>

    await step.sleep('settle', '90s')

    return runDependencyReadings(reportId, {
      step: runStep,
      run:  runCoverage,

      async loadReport(id) {
        const { data, error } = await supabaseAdmin
          .from('dependency_reports')
          .select('id, archive_id, status, intake')
          .eq('id', id)
          .maybeSingle()
        if (error) throw new Error(`load dependency report ${id}: ${error.message}`)
        return (data ?? null) as ReadingsReportRow | null
      },

      async loadArchive(archiveId) {
        const { data, error } = await supabaseAdmin
          .from('archives')
          .select('tier, status')
          .eq('id', archiveId)
          .maybeSingle()
        if (error) throw new Error(`load archive ${archiveId}: ${error.message}`)
        return data ? { tier: (data.tier ?? null) as string | null, status: (data.status ?? null) as string | null } : null
      },

      async loadAreaRows(archiveId) {
        const { data, error } = await supabaseAdmin
          .from('incident_sessions')
          .select('status, state')
          .eq('archive_id', archiveId)
        if (error) throw new Error(`load incident sessions ${archiveId}: ${error.message}`)
        return (data ?? []) as AreaCallRow[]
      },

      async saveReady(id, patch) {
        const { data, error } = await supabaseAdmin
          .from('dependency_reports')
          .update({ ...patch, status: 'ready', updated_at: patch.report_built_at })
          .eq('id', id)
          .eq('status', 'capturing')
          .select('id')
        if (error) throw new Error(`save dependency report ${id}: ${error.message}`)
        return (data ?? []).length > 0
      },

      notify: notifyInternal,
    })
  },
)
