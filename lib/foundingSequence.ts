/**
 * The Founding Sequence.
 *
 * Three incident interviews, run through the existing incident engine
 * (lib/incidentSession.ts), that replace the live Founding Session for every
 * new archive. The depositor does them in their own time, by voice or typed,
 * on /archive/founding. Nothing here is a new engine: this module owns the
 * seeds, the marker that tags an incident as one of the three founding calls,
 * and the read-side status the page and the dashboards render.
 *
 * Pure functions first (unit-tested, no I/O), then two thin persistence
 * helpers over incident_sessions at the bottom.
 *
 * Copy rules apply to every string that reaches a screen: no em dashes,
 * American English, short declarative sentences, no banned words, nothing
 * implying the entity is alive or thinks like the person.
 */

import { supabaseAdmin } from './supabase-admin'
import {
  createIncident,
  persist,
  type FoundingMarker,
  type IncidentSession,
  type IncidentState,
  type Phase,
  type ProbeType,
} from './incidentSession'
import { renderProbe } from './renderProbe'

export const FOUNDING_CALLS = 3 as const
export type FoundingScope = FoundingMarker['scope']
export type FoundingCall  = FoundingMarker['call']

// ── Seeds ─────────────────────────────────────────────────────────────────────
// One narrative opener per call. Authored, returned verbatim by renderProbe's
// SEED case. The category strings match the vocabulary the demo fallback seeds
// already use against incident_sessions.category ('judgment', 'conflict',
// 'risk'); confirm the column carries no CHECK before first live use (runbook).

export interface FoundingSeed {
  call:     FoundingCall
  category: string
  title:    string   // short label for the call card
  question: string   // the SEED probe, shown verbatim
}

export const FOUNDING_SEEDS: Record<FoundingScope, FoundingSeed[]> = {
  personal: [
    {
      call: 1, category: 'judgment', title: 'The hardest call',
      // The mural: an owner's hardest family call and hardest work call are
      // often the same call. No tier decides where a life is divided.
      question: 'Tell me about the hardest call you ever made, at home or at work. What was going on, and what did you do?',
    },
    {
      call: 2, category: 'conflict', title: 'Against the room',
      question: 'Tell me about a time you went against what everyone around you expected, and you were right to.',
    },
    {
      call: 3, category: 'risk', title: 'The one you got wrong',
      question: 'Tell me about a decision you got wrong, that you would make differently now, and how you found out.',
    },
  ],
  business: [
    {
      call: 1, category: 'judgment', title: 'The hardest call',
      question: 'Tell me about the hardest call you ever made running this business. What was going on, and what did you do?',
    },
    {
      call: 2, category: 'conflict', title: 'Against the room',
      question: 'Tell me about a time you went against people you respected, and you were right to.',
    },
    {
      call: 3, category: 'risk', title: 'The one you got wrong',
      question: 'Tell me about a call you got wrong, that you would make differently now, and how you found out.',
    },
  ],
}

/** Archive tier -> founding scope. Succession archives get the business seeds;
 *  everything else (active, resting, legacy, and the older tier keys) gets the
 *  personal seeds. */
export function scopeForTier(tier: string | null | undefined): FoundingScope {
  return tier === 'succession' ? 'business' : 'personal'
}

export function seedFor(scope: FoundingScope, call: FoundingCall): FoundingSeed {
  const seed = FOUNDING_SEEDS[scope].find(s => s.call === call)
  if (!seed) throw new Error(`no founding seed for ${scope} call ${call}`)
  return seed
}

// ── Phase labels ──────────────────────────────────────────────────────────────
// What the depositor sees above each probe. Honest about where the interview
// is, with no count and no percentage, because the number of turns is not
// fixed (detours and re-probes change it).

export function phaseLabel(probeType: ProbeType | 'SEED' | 'TIMELINE' | null | undefined): string {
  switch (probeType) {
    case 'SEED':        return 'The call'
    case 'TIMELINE':    return 'In order'
    case 'CUE':         return 'The first sign'
    case 'OPTION':      return 'The options'
    case 'BASIS':       return 'What tipped it'
    case 'BOUNDARY':    return 'Where it stops'
    case 'ERROR':       return 'The trap'
    case 'ANALOGUE':    return 'The pattern'
    case 'GOAL':        return 'What you were protecting'
    case 'STAKE':       return 'The stakes'
    case 'READ':        return 'The people'
    case 'CALIBRATION': return 'How sure'
    case 'TRADEOFF':    return 'The tradeoff'
    default:            return 'The call'
  }
}

// ── Status (pure) ─────────────────────────────────────────────────────────────

export interface FoundingRow {
  id:         string
  status:     'open' | 'complete' | 'abandoned'
  phase:      Phase
  state:      IncidentState
  created_at: string
}

export interface FoundingCallStatus {
  call:     FoundingCall
  title:    string
  state:    'done' | 'current' | 'upcoming'
  deposits: number       // accepted answers written as deposits
  turns:    number       // probes answered, including re-probes
}

export interface FoundingStatus {
  scope:      FoundingScope
  calls:      FoundingCallStatus[]
  completed:  number
  done:       boolean    // all three founding calls complete
  nextCall:   FoundingCall | null
  // The incident that is open right now, founding or not. There is at most one
  // open incident per archive (partial unique index), so an open non-founding
  // interview blocks a new founding call until it is finished.
  current: {
    incidentId:  string
    isFounding:  boolean
    call:        FoundingCall | null
    probeType:   ProbeType | 'SEED' | 'TIMELINE' | null
    question:    string | null
    label:       string
    turns:       number
    deposits:    number
  } | null
}

function depositsIn(state: IncidentState): number {
  return (state.probeHistory ?? []).filter(r => r.depositId).length
}

/** Pure. Given every incident_sessions row for one archive (any order), build
 *  the founding status the page renders. A founding call counts as done only
 *  when its incident is `complete`; an abandoned founding incident frees its
 *  call to be started again. */
export function foundingStatusFromRows(rows: FoundingRow[], scope: FoundingScope): FoundingStatus {
  const byCall = new Map<FoundingCall, FoundingRow>()
  for (const r of rows) {
    const m = r.state?.founding
    if (!m) continue
    if (r.status === 'abandoned') continue
    const prev = byCall.get(m.call)
    // Prefer a complete row over an open one for the same call (defensive; the
    // start helper never opens a call that already has a complete row).
    if (!prev || (prev.status !== 'complete' && r.status === 'complete')) byCall.set(m.call, r)
  }

  const open = rows.find(r => r.status === 'open') ?? null
  const openMarker = open?.state?.founding ?? null

  const calls: FoundingCallStatus[] = ([1, 2, 3] as FoundingCall[]).map(call => {
    const row = byCall.get(call)
    const seed = seedFor(scope, call)
    if (row?.status === 'complete') {
      return { call, title: seed.title, state: 'done', deposits: depositsIn(row.state), turns: row.state.probeHistory?.length ?? 0 }
    }
    if (row?.status === 'open') {
      return { call, title: seed.title, state: 'current', deposits: depositsIn(row.state), turns: row.state.probeHistory?.length ?? 0 }
    }
    return { call, title: seed.title, state: 'upcoming', deposits: 0, turns: 0 }
  })

  const completed = calls.filter(c => c.state === 'done').length
  const done = completed >= FOUNDING_CALLS
  const nextCall = done ? null : (calls.find(c => c.state !== 'done')?.call ?? null)

  return {
    scope,
    calls,
    completed,
    done,
    nextCall,
    current: open
      ? {
          incidentId: open.id,
          isFounding: !!openMarker,
          call:       openMarker?.call ?? null,
          probeType:  open.state.pendingProbeType ?? null,
          question:   open.state.pendingQuestion ?? null,
          label:      phaseLabel(open.state.pendingProbeType),
          turns:      open.state.probeHistory?.length ?? 0,
          deposits:   depositsIn(open.state),
        }
      : null,
  }
}

/** Every user-facing string in this module, for the copy-rule test. */
export function allFoundingCopy(): string[] {
  const out: string[] = []
  for (const scope of ['personal', 'business'] as FoundingScope[]) {
    for (const s of FOUNDING_SEEDS[scope]) out.push(s.title, s.question)
  }
  const types: (ProbeType | 'SEED' | 'TIMELINE')[] = [
    'SEED', 'TIMELINE', 'CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR', 'ANALOGUE', 'GOAL', 'STAKE', 'READ', 'CALIBRATION', 'TRADEOFF',
  ]
  for (const t of types) out.push(phaseLabel(t))
  return out
}

// ── Persistence ───────────────────────────────────────────────────────────────

const ROW_COLS = 'id, status, phase, state, created_at'

export async function loadFoundingRows(archiveId: string): Promise<FoundingRow[]> {
  const { data, error } = await supabaseAdmin
    .from('incident_sessions')
    .select(ROW_COLS)
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`loadFoundingRows failed: ${error.message}`)
  return (data ?? []) as FoundingRow[]
}

export async function getFoundingStatus(archiveId: string, tier: string | null | undefined): Promise<FoundingStatus> {
  const rows = await loadFoundingRows(archiveId)
  return foundingStatusFromRows(rows, scopeForTier(tier))
}

/**
 * Open the next founding call for an archive. Refuses (returns null) when the
 * sequence is done or when any incident is already open, since the partial
 * unique index allows one open incident per archive and the caller should
 * continue that one instead. Sets the SEED probe as pending exactly the way
 * /api/archive/b2b-question/next does, so /answer can take it from here.
 */
export async function startFoundingCall(
  archiveId: string,
  tier: string | null | undefined,
): Promise<{ session: IncidentSession; call: FoundingCall } | null> {
  const status = await getFoundingStatus(archiveId, tier)
  if (status.done || status.current || !status.nextCall) return null

  const scope = status.scope
  const call  = status.nextCall
  const seed  = seedFor(scope, call)

  const session = await createIncident(archiveId, { questionId: null, category: seed.category })
  session.state.founding = { call, scope, startedAt: new Date().toISOString() }
  session.state.pendingQuestion    = renderProbe({ probeType: 'SEED', anchor: '', seedText: seed.question })
  session.state.pendingProbeType   = 'SEED'
  session.state.pendingBranchIndex = -1
  await persist(session)

  return { session, call }
}
