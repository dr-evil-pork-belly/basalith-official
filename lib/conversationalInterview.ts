/**
 * Conversational follow ups: who gets them, and how a turn is written.
 * October 22, 2026. claude/BASALITH_CONVERSATIONAL_INTERVIEW_2026-10-22.md.
 *
 * WHO. Off unless CONVERSATIONAL_INTERVIEW names the record. The value is a
 * comma separated list of archive ids. There is no "on for everyone" value in
 * this slice: the interviewer runs only on records named for the A/B.
 * Only area calls, only English (preferred_language en or unset). Founding
 * calls, the demo, and every other record keep the spine, unchanged.
 *
 * THE ARM. The A/B is within person: each named record alternates between
 * the interviewer and the spine, one area call each, and the starting arm
 * depends on the record id, so across people half start on each. The arm is
 * stamped on the call (incident_sessions.state.interviewArm) at its first
 * follow up and never changes for that call. CONVERSATIONAL_INTERVIEW_ARM set
 * to 'interviewer' or 'spine' forces every new call on a named record to one
 * arm, for a manual run.
 *
 * A TURN. Draft (lib/interviewer.ts), check (lib/interviewGuard.ts checkDraft,
 * then judgeDraft). One rewrite with the reasons. A second failure, a model
 * error, or a turn that has run past its time budget serves the spine
 * sentence the caller already rendered. The person never waits on a third
 * model call.
 *
 * Every turn on an armed call, both arms, is logged on the call's state with
 * timings, so the A/B can read latency and guard failures from the same rows.
 */

import { draftQuestion, type DraftFn, type InterviewerInput, type Turn } from './interviewer'
import { checkDraft, judgeDraft, type JudgeFn } from './interviewGuard'
import type { ProbeType } from './incidentSession'

export type InterviewArm = 'interviewer' | 'spine'
export type QuestionSource = 'interviewer' | 'spine'

/** Past this, a failed first attempt goes straight to the spine. */
const SECOND_ATTEMPT_BUDGET_MS = 15_000
/** Entries kept on one call's state. */
export const LOG_CAP = 80

export interface FollowUpAttempt {
  draft: string | null
  aim: string | null
  fails: string[]
  judgeReason: string | null
  msDraft: number
  msJudge: number
}

export interface FollowUpResult {
  text: string
  source: QuestionSource
  aim: string | null
  attempts: FollowUpAttempt[]
  msTotal: number
}

export interface InterviewLogEntry {
  at: string
  probeType: string
  arm: InterviewArm
  source: QuestionSource
  /** Classifier, timeline parse, and saturation for the answer just given. */
  msModel: number
  msTotal: number
  aim: string | null
  attempts: FollowUpAttempt[]
}

type Env = Record<string, string | undefined>

/** Whether this record is named for the interviewer. */
export function enabledFor(archiveId: string, env: Env = process.env): boolean {
  const raw = (env.CONVERSATIONAL_INTERVIEW ?? '').trim().toLowerCase()
  if (!raw || raw === 'off') return false
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean)
  return ids.includes(archiveId.trim().toLowerCase())
}

/** Whether a call qualifies at all. Exported for the test. */
export function callQualifies(input: {
  archiveId: string
  isAreaCall: boolean
  language: string | null | undefined
}, env: Env = process.env): boolean {
  const lang = (input.language ?? 'en').trim().toLowerCase() || 'en'
  return input.isAreaCall && lang === 'en' && enabledFor(input.archiveId, env)
}

/**
 * The arm for a call that has none yet. priorArmedCalls counts this record's
 * calls that already carry an arm, in any status.
 */
export function armFor(archiveId: string, priorArmedCalls: number, env: Env = process.env): InterviewArm {
  const forced = (env.CONVERSATIONAL_INTERVIEW_ARM ?? '').trim().toLowerCase()
  if (forced === 'interviewer' || forced === 'spine') return forced
  const hex = archiveId.replace(/[^0-9a-f]/gi, '')
  const offset = parseInt(hex.slice(-1) || '0', 16) % 2
  return (priorArmedCalls + offset) % 2 === 0 ? 'interviewer' : 'spine'
}

const WRITABLE = new Set<string>([
  'CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'TRADEOFF', 'ANALOGUE', 'ERROR', 'GOAL', 'STAKE', 'READ', 'CALIBRATION',
])

export interface FollowUpDeps {
  draft: DraftFn
  judge: JudgeFn
  now: () => number
}

const DEFAULT_DEPS: FollowUpDeps = { draft: draftQuestion, judge: judgeDraft, now: () => Date.now() }

/**
 * One follow up on the interviewer arm. Returns the interviewer's question
 * when a draft passes both checks, otherwise spineText.
 */
export async function writeFollowUp(
  input: Omit<InterviewerInput, 'probeType' | 'retryReasons'> & {
    probeType: ProbeType | 'SEED' | 'TIMELINE'
    /** What lib/renderProbe.ts rendered for this turn. The fallback. */
    spineText: string
    /** Everything the person said in this call. */
    said: readonly string[]
  },
  deps: FollowUpDeps = DEFAULT_DEPS,
): Promise<FollowUpResult> {
  const start = deps.now()
  const attempts: FollowUpAttempt[] = []
  const spine = (): FollowUpResult => ({
    text: input.spineText, source: 'spine', aim: null, attempts, msTotal: deps.now() - start,
  })

  // SEED is authored copy and TIMELINE is the instruction the timeline parser
  // depends on. Both stay fixed.
  if (!WRITABLE.has(input.probeType)) return spine()
  const probeType = input.probeType as ProbeType

  let retryReasons: string[] | undefined
  for (let i = 0; i < 2; i++) {
    if (i === 1 && deps.now() - start > SECOND_ATTEMPT_BUDGET_MS) break

    const t0 = deps.now()
    const draft = await deps.draft({ ...input, probeType, retryReasons })
    const msDraft = deps.now() - t0

    if (!draft) {
      attempts.push({ draft: null, aim: null, fails: ['draft_error'], judgeReason: null, msDraft, msJudge: 0 })
      retryReasons = ['the draft could not be read']
      continue
    }

    const fails: string[] = checkDraft(draft.question, { said: input.said, probeType, lens: input.lens })
    let judgeReason: string | null = null
    let msJudge = 0
    if (fails.length === 0) {
      const t1 = deps.now()
      const verdict = await deps.judge(draft.question, input.turns as Turn[])
      msJudge = deps.now() - t1
      judgeReason = verdict.reason
      if (!verdict.pass) fails.push('judge')
    }
    attempts.push({ draft: draft.question, aim: draft.aim || null, fails, judgeReason, msDraft, msJudge })

    if (fails.length === 0) {
      return { text: draft.question, source: 'interviewer', aim: draft.aim || null, attempts, msTotal: deps.now() - start }
    }
    retryReasons = fails.map(f => (f === 'judge' && judgeReason ? `judge: ${judgeReason}` : f))
  }
  return spine()
}

/** Append to a call's log, keeping the newest LOG_CAP entries. */
export function appendLog(log: InterviewLogEntry[] | undefined, entry: InterviewLogEntry): InterviewLogEntry[] {
  const next = [...(log ?? []), entry]
  return next.length > LOG_CAP ? next.slice(next.length - LOG_CAP) : next
}
