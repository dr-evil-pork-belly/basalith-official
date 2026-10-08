/**
 * Key person dependency assessment, the reads and the one event. Slice 3b,
 * October 8, 2026.
 *
 * Everything here touches Supabase or Inngest. The decisions are in
 * lib/assessment.ts, which is pure and tested; this file loads the rows those
 * decisions need and sends `dependency.readings.requested` when they say so.
 * Used by /api/archive/assessment and /api/archive/b2b-question/answer.
 */

import { supabaseAdmin } from './supabase-admin'
import { inngest } from './inngest'
import { notifyInternal } from './internalNotify'
import { areasCapturedFromRows, readingsDue, type AreaCallRow } from './assessment'
import { validateIntake } from './dependencyIntake'

/** The columns of dependency_reports the founder's surfaces read. */
export interface AssessmentRow {
  id:              string
  archive_id:      string | null
  status:          string
  intake:          unknown
  buyer_name:      string
  buyer_org:       string | null
  report_built_at: string | null
}

const ROW_COLS = 'id, archive_id, status, intake, buyer_name, buyer_org, report_built_at'

/** The assessment a founder record belongs to. One per record (unique index). */
export async function loadAssessmentForArchive(archiveId: string): Promise<AssessmentRow | null> {
  const { data, error } = await supabaseAdmin
    .from('dependency_reports')
    .select(ROW_COLS)
    .eq('archive_id', archiveId)
    .maybeSingle()
  if (error) throw new Error(`load assessment for ${archiveId}: ${error.message}`)
  return (data ?? null) as AssessmentRow | null
}

export async function loadAreaRows(archiveId: string): Promise<AreaCallRow[]> {
  const { data, error } = await supabaseAdmin
    .from('incident_sessions')
    .select('status, state')
    .eq('archive_id', archiveId)
  if (error) throw new Error(`load incident sessions ${archiveId}: ${error.message}`)
  return (data ?? []) as AreaCallRow[]
}

export type ReadingsRequest =
  | { requested: true; reportId: string }
  | { requested: false; reason: 'no_assessment' | 'not_due' | 'send_failed' }

/**
 * Send `dependency.readings.requested` if, and only if, the record is whole:
 * the report is 'capturing', all eight areas are captured, and the intake is
 * in (readingsDue in lib/assessment.ts). Called after the event that could
 * have completed the record: an area call closing, or the intake being saved.
 *
 * No event id is set, on purpose. Inngest holds an id for 24 hours, and a
 * report whose readings were refused must be requestable again the same day.
 * A duplicate costs nothing: the job checks the row before it spends, and once
 * the report is 'ready' a second run is skipped (lib/dependencyReadings.ts).
 *
 * A failed send is not silent. Nothing else would ever request the readings,
 * so the founder of Basalith is told.
 */
export async function requestReadingsIfDue(archiveId: string): Promise<ReadingsRequest> {
  const row = await loadAssessmentForArchive(archiveId)
  if (!row) return { requested: false, reason: 'no_assessment' }

  const captured = areasCapturedFromRows(await loadAreaRows(archiveId))
  const due = readingsDue({ status: row.status, captured, hasIntake: validateIntake(row.intake).ok })
  if (!due) return { requested: false, reason: 'not_due' }

  try {
    await inngest.send({ name: 'dependency.readings.requested', data: { reportId: row.id } })
    return { requested: true, reportId: row.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[assessment] readings request failed:', row.id, message)
    await notifyInternal({
      subject: 'Dependency report: the readings could not be requested',
      text:    [`Report: ${row.id}`, `Record: ${archiveId}`, `Error: ${message}`, 'Nothing will retry this. Send dependency.readings.requested by hand.'].join('\n'),
    })
    return { requested: false, reason: 'send_failed' }
  }
}
