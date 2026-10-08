/**
 * Key person dependency assessment, the pure rules. Slice 3a, October 8, 2026.
 *
 * An assessment is a founder's record made for one named buyer's report
 * (dependency_reports, migration 20261008). The founder runs one area call per
 * business domain, answers the intake (lib/dependencyIntake.ts), and two
 * coverage readings are taken (lib/dependencyReadings.ts). This file holds
 * every decision in that sequence that is a function of rows already read.
 * No DB, no model, no IO.
 *
 * THE RECORD. An assessment is an archives row with tier = 'succession' and
 * status = 'assessment'. The tier is what gives it the business seeds and the
 * business probe set (lib/coverageSet.ts, lib/foundingSequence.ts). The status
 * is what keeps it out of every scheduled email and the monthly coverage sweep,
 * which all select status = 'active' (lib/cronGates.test.ts). There is no
 * CHECK on archives.status; 'assessment' joins 'active', 'trial', and 'drill'
 * by convention. Nothing writes that status yet: the start route is slice 3b.
 *
 * DECIDED BY DAVID, October 7 and 8, 2026.
 *   - Minimum record: one closed area call per business domain, eight in all.
 *   - No Founding Sequence for an assessment. Straight to the area calls.
 *   - The founder has RELEASE_DAYS to release a finished report.
 *   - The record is purged PURGE_DAYS after the report closes.
 */

import { B2B_DOMAINS } from './b2bDomains'

export const ASSESSMENT_STATUS = 'assessment'

/** Days a founder has to release a report after it is built. */
export const RELEASE_DAYS = 14

/** Days after a report closes before the founder's record is purged. */
export const PURGE_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

/** dependency_reports.status. Mirrors the CHECK in migration 20261008. */
export type ReportStatus =
  | 'ordered'
  | 'capturing'
  | 'ready'
  | 'released'
  | 'not_released'
  | 'not_completed'

export const OPEN_REPORT_STATUSES:   ReportStatus[] = ['ordered', 'capturing', 'ready']
export const CLOSED_REPORT_STATUSES: ReportStatus[] = ['released', 'not_released', 'not_completed']

export function isAssessment(archive: { status?: string | null }): boolean {
  return archive.status === ASSESSMENT_STATUS
}

/** The eight areas an assessment must cover, in domain order. */
export function assessmentAreas(): string[] {
  return B2B_DOMAINS.map(d => d.name)
}

/**
 * The columns of incident_sessions this file reads. Structural on purpose, so
 * it accepts a FoundingRow (lib/foundingSequence.ts) without importing the
 * incident engine.
 */
export interface AreaCallRow {
  status: string
  state?: {
    areaCall?:     { area?: string; scope?: string } | null
    probeHistory?: { depositId?: string | null }[] | null
  } | null
}

/**
 * The areas this record has captured, in domain order.
 *
 * An area counts when a business area call for it is `complete` AND that call
 * wrote at least one deposit. An open or abandoned call does not count, and
 * neither does a call that closed with nothing accepted: the report says the
 * founder was interviewed on every domain, so a call that produced no deposit
 * is not an interview. A personal scope marker never counts, and an area name
 * that is not a live business domain is ignored.
 */
export function areasCapturedFromRows(rows: readonly AreaCallRow[]): string[] {
  const done = new Set<string>()
  for (const r of rows) {
    if (r.status !== 'complete') continue
    const marker = r.state?.areaCall
    if (!marker || marker.scope !== 'business' || typeof marker.area !== 'string') continue
    const deposits = (r.state?.probeHistory ?? []).filter(p => p?.depositId).length
    if (deposits === 0) continue
    done.add(marker.area)
  }
  return assessmentAreas().filter(a => done.has(a))
}

/** The next area to call, in domain order, or null when all eight are captured. */
export function nextArea(captured: readonly string[]): string | null {
  const have = new Set(captured)
  return assessmentAreas().find(a => !have.has(a)) ?? null
}

export function captureDone(captured: readonly string[]): boolean {
  return nextArea(captured) === null
}

/**
 * Whether the two readings should be requested now.
 *
 * Only while the report is 'capturing', with all eight areas captured and the
 * intake in. Once the report is 'ready' or closed the answer is no, which is
 * what stops a late event from spending a second pair of runs.
 */
export function readingsDue(input: {
  status:    string | null | undefined
  captured:  readonly string[]
  hasIntake: boolean
}): boolean {
  return input.status === 'capturing' && input.hasIntake && captureDone(input.captured)
}

/** When the founder's window to release a built report ends. */
export function releaseDueAt(reportBuiltAt: string | Date): string {
  return new Date(new Date(reportBuiltAt).getTime() + RELEASE_DAYS * DAY_MS).toISOString()
}

/** True once a 'ready' report has sat past its release window. */
export function releaseLapsed(reportBuiltAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(releaseDueAt(reportBuiltAt)).getTime()
}

/** dependency_reports.purge_after for a report that closed at `closedAt`. */
export function purgeAfter(closedAt: string | Date): string {
  return new Date(new Date(closedAt).getTime() + PURGE_DAYS * DAY_MS).toISOString()
}

// ── What the founder's page shows ─────────────────────────────────────────────

export type AssessmentStage =
  /** Calls or intake still to do. */
  | 'capture'
  /** All eight areas and the intake are in; the two readings are due or under way. */
  | 'reading'
  | 'ready'
  | 'released'
  | 'not_released'
  | 'not_completed'

export interface AssessmentProgress {
  stage:    AssessmentStage
  areas:    { area: string; description: string; captured: boolean }[]
  captured: number
  total:    number
  /** The next area to call in domain order, or null when all are captured. */
  next:     string | null
  intakeIn: boolean
}

/**
 * Pure. The founder's view of an assessment, from the report status, the areas
 * captured, and whether the intake is in. 'ordered' reads as 'capture': the
 * record exists the moment the founder starts, and the status follows.
 */
export function assessmentProgress(input: {
  status:    string | null | undefined
  captured:  readonly string[]
  hasIntake: boolean
}): AssessmentProgress {
  const have = new Set(input.captured)
  const areas = B2B_DOMAINS.map(d => ({ area: d.name, description: d.description, captured: have.has(d.name) }))
  const captured = areas.filter(a => a.captured).length

  let stage: AssessmentStage
  switch (input.status) {
    case 'ready':
    case 'released':
    case 'not_released':
    case 'not_completed':
      stage = input.status
      break
    default:
      stage = readingsDue(input) ? 'reading' : 'capture'
  }

  return { stage, areas, captured, total: areas.length, next: nextArea(input.captured), intakeIn: input.hasIntake }
}

/**
 * Whether the founder can read the report. Once it is built, always, until the
 * purge clears the snapshot: a report the founder did not release is still
 * theirs to read. Before it is built there is nothing to show.
 */
export function founderCanReadReport(status: string | null | undefined): boolean {
  return status === 'ready' || status === 'released' || status === 'not_released'
}
