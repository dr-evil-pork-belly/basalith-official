/**
 * Incident interview — stateful spine.
 *
 * This module is the deterministic reducer for the incident interview plus thin
 * persistence wrappers over `incident_sessions`. It makes NO Anthropic calls.
 * Model outputs (the classifier result and the saturation result) are passed in
 * as arguments so `advance` stays pure and unit-testable. The Step 2 model layer
 * is responsible for generating question text, writing deposits, and patching
 * `depositId` onto the most recently appended ProbeRecord.
 *
 * Per-branch decision spine:
 *   CUE -> OPTION -> BASIS -> [saturation gate] -> BOUNDARY -> ERROR
 *
 * Phase flow:
 *   SEED -> TIMELINE -> DECISION_LOOP (one spine per branch)
 *        -> GENERALIZE (one rule-level BOUNDARY, then one rule-level ERROR)
 *        -> TRADEOFF_BATTERY (up to three TRADEOFF probes from tensions, min one)
 *        -> COMPLETE
 */

import { supabaseAdmin } from './supabase-admin'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProbeType =
  | 'CUE'
  | 'OPTION'
  | 'BASIS'
  | 'BOUNDARY'
  | 'TRADEOFF'
  | 'ANALOGUE'
  | 'ERROR'
  | 'GOAL'
  // Incident-level coverage dimensions (not part of the per-branch SPINE). CUE is
  // already SPINE[0] and is deliberately not among these.
  | 'STAKE'
  | 'READ'
  | 'CALIBRATION'

export type Phase =
  | 'SEED'
  | 'TIMELINE'
  | 'DECISION_LOOP'
  | 'DIMENSIONS'
  | 'GENERALIZE'
  | 'TRADEOFF_BATTERY'
  | 'COMPLETE'

// Incident-level coverage dimensions. Each rides state.dimensions; every tag rides
// training_pairs.metadata. Forward-only: a dimension leaves 'unelicited' once.
export type DimensionName = 'read' | 'stake' | 'calibration'
export type DimensionStatus = 'unelicited' | 'substantive' | 'not_a_factor'

export interface Branch {
  index: number
  summary: string
  chosen: string
  saturated: boolean
}

export interface ProbeRecord {
  branchIndex: number // -1 for SEED/TIMELINE/GENERALIZE/TRADEOFF_BATTERY
  probeType: ProbeType | 'SEED' | 'TIMELINE'
  question: string
  answer: string
  depositId: string | null // null if the answer was sentiment-only and re-probed; caller patches otherwise
}

/** Detour awaiting its answer. Carries the branch it belongs to so the resume
 *  records the detour against the right branch even after the spine advanced. */
export interface PendingDetour {
  type: Extract<ProbeType, 'ANALOGUE' | 'GOAL'>
  branchIndex: number
}

export interface IncidentState {
  branches: Branch[]
  currentBranchIndex: number
  spineCursor: number // position within the per-branch spine (also reused for GENERALIZE/TRADEOFF step)
  reprobeUsedOnCurrent: boolean // at most one re-probe per spine position
  probeHistory: ProbeRecord[]
  tensions: string[] // collected for the tradeoff battery
  pendingDetour: PendingDetour | null // set while a detour probe is out, cleared on its answer
  // Incident-level coverage. Flat, so it rides the serialized state jsonb with no
  // collision with the pending* fields below and no schema change.
  dimensions: Record<DimensionName, DimensionStatus>
  probeBudgetUsed: number // dimension probes spent this incident (cap: BUDGET)
  // Set by the serve/answer routes (Step 3 wiring), never read by the reducer:
  // the probe currently shown to the founder, stored for reload-safety so a
  // repeated GET /next re-serves the same probe without advancing.
  pendingQuestion?: string
  pendingProbeType?: ProbeType | 'SEED' | 'TIMELINE'
  pendingBranchIndex?: number
}

export interface IncidentSession {
  id: string
  archiveId: string
  seedQuestionId: string | null
  category: string
  phase: Phase
  status: 'open' | 'complete' | 'abandoned'
  state: IncidentState
}

// Inputs passed in from the model layer (built in Step 2), not computed here.
export interface ClassifierOut {
  anchor: string
  containsRule: boolean
  detour: 'ANALOGUE' | 'GOAL' | 'NONE'
  branchComplete: boolean
  tension: string | null
  // Coverage tag for the answer just given: which dimension (if any) this turn
  // served, and whether substantively or as an explicit not-a-factor. null when
  // unsure, so the dimension stays 'unelicited' and its probe still asks.
  dimensionSignal: { dimension: DimensionName; status: 'substantive' | 'not_a_factor' } | null
}

export interface SaturationOut {
  saturated: boolean
}

export interface ProbeDecision {
  probeType: ProbeType | 'SEED' | 'TIMELINE'
  phaseAfter: Phase
  branchIndexForProbe: number
  incidentComplete: boolean
}

// ── Spine constants ───────────────────────────────────────────────────────────

const SPINE: ProbeType[] = ['CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR']
const IDX_BASIS = 2
const IDX_ERROR = 4

// Dimension battery, run once after the last branch and before GENERALIZE.
// Ask order: stake first (usually answerable, frames read), read second (needs
// named people), calibration last (needs the decision on the table). At most
// BUDGET probes total, so the interview never turns into an interrogation.
const BUDGET = 3
const DIMENSION_ORDER: DimensionName[] = ['stake', 'read', 'calibration']

export function initialIncidentState(): IncidentState {
  return {
    branches: [],
    currentBranchIndex: 0,
    spineCursor: 0,
    reprobeUsedOnCurrent: false,
    probeHistory: [],
    tensions: [],
    pendingDetour: null,
    dimensions: { read: 'unelicited', stake: 'unelicited', calibration: 'unelicited' },
    probeBudgetUsed: 0,
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

// ── Dimension helpers ─────────────────────────────────────────────────────────

// Common non-name capitalized tokens (sentence starts, pronouns) to keep out of
// the READ people anchor. Not exhaustive; the anchor only needs to be plausible.
const NON_NAME = new Set([
  'The', 'A', 'An', 'I', 'We', 'You', 'He', 'She', 'They', 'It', 'My', 'Our',
  'His', 'Her', 'Their', 'When', 'After', 'Before', 'Once', 'Then', 'So', 'But',
  'And', 'Or', 'If', 'Whether', 'What', 'Why', 'How', 'Decided', 'Chose',
  'To', 'Of', 'On', 'In', 'At', 'For', 'With', 'That', 'This',
])

/** People named across the branch summaries, as a short anchor for the READ probe.
 *  Empty string when the timeline named no one, in which case READ is skipped
 *  entirely (a READ probe that names no one is a bug). Pure and deterministic. */
export function deriveReadAnchor(branches: { summary: string; chosen: string }[]): string {
  const names: string[] = []
  const seen = new Set<string>()
  for (const b of branches ?? []) {
    for (const raw of `${b?.summary ?? ''} ${b?.chosen ?? ''}`.split(/\s+/)) {
      const t = raw.replace(/[^A-Za-z'’-]/g, '')
      if (/^[A-Z][a-z’'-]+$/.test(t) && !NON_NAME.has(t) && !seen.has(t)) {
        seen.add(t)
        names.push(t)
      }
    }
  }
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names[0]}, ${names[1]}, and ${names[2]}`
}

/** READ is askable only when the timeline named people. stake/calibration are
 *  always askable while 'unelicited'. */
function askableDimensions(st: IncidentState): DimensionName[] {
  const readOk = deriveReadAnchor(st.branches).length > 0
  return DIMENSION_ORDER.filter(
    d => st.dimensions[d] === 'unelicited' && (d !== 'read' || readOk),
  )
}

function dimensionProbeType(d: DimensionName): ProbeType {
  return d === 'stake' ? 'STAKE' : d === 'read' ? 'READ' : 'CALIBRATION'
}

/** Forward-only write: a dimension leaves 'unelicited' exactly once, never regresses. */
function setDimension(st: IncidentState, d: DimensionName, status: DimensionStatus): void {
  if (st.dimensions[d] === 'unelicited') st.dimensions[d] = status
}

/** Three tradeoff probes when three tensions exist; otherwise as many as exist,
 *  minimum one. */
function tradeoffTotal(st: IncidentState): number {
  return Math.max(1, Math.min(3, st.tensions.length))
}

/** The probe to ask now, given the session's current phase and cursor. */
function emitCurrent(s: IncidentSession): ProbeDecision {
  const st = s.state
  switch (s.phase) {
    case 'TIMELINE':
      return { probeType: 'TIMELINE', phaseAfter: 'TIMELINE', branchIndexForProbe: -1, incidentComplete: false }
    case 'DECISION_LOOP':
      return {
        probeType: SPINE[st.spineCursor],
        phaseAfter: 'DECISION_LOOP',
        branchIndexForProbe: st.currentBranchIndex,
        incidentComplete: false,
      }
    case 'DIMENSIONS': {
      const target = askableDimensions(st)[0]
      // Only reached while an askable dimension remains; the reducer routes to
      // GENERALIZE the instant none do. Fall closed to GENERALIZE's BOUNDARY.
      if (!target) {
        return { probeType: 'BOUNDARY', phaseAfter: 'GENERALIZE', branchIndexForProbe: -1, incidentComplete: false }
      }
      return { probeType: dimensionProbeType(target), phaseAfter: 'DIMENSIONS', branchIndexForProbe: -1, incidentComplete: false }
    }
    case 'GENERALIZE':
      return {
        probeType: st.spineCursor === 0 ? 'BOUNDARY' : 'ERROR',
        phaseAfter: 'GENERALIZE',
        branchIndexForProbe: -1,
        incidentComplete: false,
      }
    case 'TRADEOFF_BATTERY':
      return { probeType: 'TRADEOFF', phaseAfter: 'TRADEOFF_BATTERY', branchIndexForProbe: -1, incidentComplete: false }
    case 'COMPLETE':
      return { probeType: 'TRADEOFF', phaseAfter: 'COMPLETE', branchIndexForProbe: -1, incidentComplete: true }
    default:
      return { probeType: 'SEED', phaseAfter: 'SEED', branchIndexForProbe: -1, incidentComplete: false }
  }
}

/** Move the cursor from the just-answered spine position to the next one,
 *  applying the saturation gate (BASIS only), the classifier's branchComplete
 *  signal, and branch -> branch / branch -> GENERALIZE transitions. Mutates `s`. */
function applySpineAdvance(s: IncidentSession, classifierOut: ClassifierOut, saturationOut: SaturationOut): void {
  const st = s.state
  const cur = st.spineCursor
  let branchDone = false

  if (classifierOut.branchComplete === true) {
    branchDone = true
  } else if (cur === IDX_BASIS) {
    // Saturation gate runs only at the BASIS -> next transition.
    if (saturationOut.saturated) {
      st.branches[st.currentBranchIndex].saturated = true
      branchDone = true // skip BOUNDARY and ERROR for this branch
    } else {
      st.spineCursor = IDX_BASIS + 1 // BOUNDARY
    }
  } else if (cur < IDX_ERROR) {
    st.spineCursor = cur + 1
  } else {
    branchDone = true // answered ERROR — branch spine exhausted
  }

  // New spine position (or new branch) — a fresh re-probe budget.
  st.reprobeUsedOnCurrent = false

  if (branchDone) moveToNextBranchOrPhase(s)
}

function moveToNextBranchOrPhase(s: IncidentSession): void {
  const st = s.state
  st.currentBranchIndex += 1
  if (st.currentBranchIndex < st.branches.length) {
    st.spineCursor = 0 // next branch starts at CUE
    st.reprobeUsedOnCurrent = false
  } else {
    // All branches exhausted -> DIMENSIONS battery (if any open + budget) then
    // rule-level GENERALIZE (BOUNDARY then ERROR).
    enterPostLoop(s)
  }
}

/** After the last branch's spine: run the DIMENSIONS battery when a dimension is
 *  still askable and budget remains, otherwise skip straight to GENERALIZE. */
function enterPostLoop(s: IncidentSession): void {
  const st = s.state
  st.spineCursor = 0
  st.reprobeUsedOnCurrent = false
  s.phase =
    st.probeBudgetUsed < BUDGET && askableDimensions(st).length > 0 ? 'DIMENSIONS' : 'GENERALIZE'
}

// ── Reducer ───────────────────────────────────────────────────────────────────

/**
 * Pure transition. Takes the session, the answer just given, and the model-layer
 * outputs for that answer; appends exactly one ProbeRecord and returns the next
 * probe to ask. Never mutates the passed-in session.
 */
export function advance(
  session: IncidentSession,
  lastAnswer: string,
  classifierOut: ClassifierOut,
  saturationOut: SaturationOut,
): { session: IncidentSession; decision: ProbeDecision } {
  const s = clone(session)
  const st = s.state

  // Fold a narration-borne dimension signal (forward-only, no budget spend) on any
  // non-dimension turn: free narration can close a dimension with no probe of its
  // own. The DIMENSIONS case below owns its close + budget for directly-asked ones.
  if (s.phase !== 'DIMENSIONS' && classifierOut.dimensionSignal) {
    setDimension(st, classifierOut.dimensionSignal.dimension, classifierOut.dimensionSignal.status)
  }

  const collectTension = () => {
    if (classifierOut.tension) st.tensions.push(classifierOut.tension)
  }
  const record = (branchIndex: number, probeType: ProbeRecord['probeType']) => {
    st.probeHistory.push({ branchIndex, probeType, question: '', answer: lastAnswer, depositId: null })
  }

  switch (s.phase) {
    case 'SEED': {
      record(-1, 'SEED')
      collectTension()
      s.phase = 'TIMELINE'
      return { session: s, decision: emitCurrent(s) }
    }

    case 'TIMELINE': {
      record(-1, 'TIMELINE')
      collectTension()
      // Branches are populated by the caller from the timeline parser before
      // this call. Fall closed to a single branch if none were set.
      if (st.branches.length === 0) {
        st.branches = [{ index: 0, summary: '', chosen: '', saturated: false }]
      }
      s.phase = 'DECISION_LOOP'
      st.currentBranchIndex = 0
      st.spineCursor = 0
      st.reprobeUsedOnCurrent = false
      st.pendingDetour = null
      return { session: s, decision: emitCurrent(s) }
    }

    case 'DECISION_LOOP': {
      // Resume from a detour: this answer is the detour probe's answer.
      if (st.pendingDetour) {
        record(st.pendingDetour.branchIndex, st.pendingDetour.type)
        collectTension()
        st.pendingDetour = null
        return { session: s, decision: emitCurrent(s) }
      }

      const probeType = SPINE[st.spineCursor]

      // Re-probe: sentiment-only answer, at most once per spine position.
      if (classifierOut.containsRule === false && st.reprobeUsedOnCurrent === false) {
        record(st.currentBranchIndex, probeType)
        collectTension()
        st.reprobeUsedOnCurrent = true
        return {
          session: s,
          decision: {
            probeType,
            phaseAfter: 'DECISION_LOOP',
            branchIndexForProbe: st.currentBranchIndex,
            incidentComplete: false,
          },
        }
      }

      // Accept the answer for this spine position.
      record(st.currentBranchIndex, probeType)
      collectTension()

      // Detour: insert one ANALOGUE/GOAL probe, then resume the advanced spine.
      // Advancing first means the detour is structurally limited to one per
      // position (we never re-evaluate the position we just left).
      if (classifierOut.detour !== 'NONE') {
        const detourBranch = st.currentBranchIndex
        const detourType = classifierOut.detour
        applySpineAdvance(s, classifierOut, saturationOut)
        st.pendingDetour = { type: detourType, branchIndex: detourBranch }
        return {
          session: s,
          decision: {
            probeType: detourType,
            phaseAfter: s.phase,
            branchIndexForProbe: detourBranch,
            incidentComplete: false,
          },
        }
      }

      applySpineAdvance(s, classifierOut, saturationOut)
      return { session: s, decision: emitCurrent(s) }
    }

    case 'GENERALIZE': {
      record(-1, st.spineCursor === 0 ? 'BOUNDARY' : 'ERROR')
      collectTension()
      if (st.spineCursor === 0) {
        st.spineCursor = 1
        return {
          session: s,
          decision: { probeType: 'ERROR', phaseAfter: 'GENERALIZE', branchIndexForProbe: -1, incidentComplete: false },
        }
      }
      // Rule-level ERROR answered -> tradeoff battery.
      s.phase = 'TRADEOFF_BATTERY'
      st.spineCursor = 0
      return {
        session: s,
        decision: { probeType: 'TRADEOFF', phaseAfter: 'TRADEOFF_BATTERY', branchIndexForProbe: -1, incidentComplete: false },
      }
    }

    case 'TRADEOFF_BATTERY': {
      record(-1, 'TRADEOFF')
      collectTension()
      st.spineCursor += 1
      if (st.spineCursor >= tradeoffTotal(st)) {
        s.phase = 'COMPLETE'
        return {
          session: s,
          decision: { probeType: 'TRADEOFF', phaseAfter: 'COMPLETE', branchIndexForProbe: -1, incidentComplete: true },
        }
      }
      return {
        session: s,
        decision: { probeType: 'TRADEOFF', phaseAfter: 'TRADEOFF_BATTERY', branchIndexForProbe: -1, incidentComplete: false },
      }
    }

    case 'DIMENSIONS': {
      const target = askableDimensions(st)[0]
      record(-1, target ? dimensionProbeType(target) : 'BOUNDARY')
      collectTension()

      if (target) {
        // A directly-asked dimension is closed by its answer: substantive unless
        // the classifier explicitly reads it as not-a-factor. Forward-only.
        const sig = classifierOut.dimensionSignal
        const status = sig && sig.dimension === target ? sig.status : 'substantive'
        setDimension(st, target, status)
        // A different dimension volunteered in the same answer folds in too.
        if (sig && sig.dimension !== target) setDimension(st, sig.dimension, sig.status)
        st.probeBudgetUsed += 1
      }

      // Exit when budget is spent or nothing askable remains. Any dimension still
      // 'unelicited' at exit (budget cap, or READ with no named people) stays
      // 'unelicited' — the graceful partial, recorded in state, never synthesized.
      if (st.probeBudgetUsed >= BUDGET || askableDimensions(st).length === 0) {
        s.phase = 'GENERALIZE'
        st.spineCursor = 0
        st.reprobeUsedOnCurrent = false
      }
      return { session: s, decision: emitCurrent(s) }
    }

    default: {
      // COMPLETE — nothing further to ask.
      record(-1, 'TRADEOFF')
      return {
        session: s,
        decision: { probeType: 'TRADEOFF', phaseAfter: 'COMPLETE', branchIndexForProbe: -1, incidentComplete: true },
      }
    }
  }
}

// ── Persistence (thin wrappers over incident_sessions) ─────────────────────────

interface IncidentRow {
  id: string
  archive_id: string
  seed_question_id: string | null
  category: string
  phase: Phase
  status: 'open' | 'complete' | 'abandoned'
  state: IncidentState
}

const INCIDENT_COLS = 'id, archive_id, seed_question_id, category, phase, status, state'

function rowToSession(row: IncidentRow): IncidentSession {
  return {
    id: row.id,
    archiveId: row.archive_id,
    seedQuestionId: row.seed_question_id,
    category: row.category,
    phase: row.phase,
    status: row.status,
    state: row.state,
  }
}

export interface IncidentSeed {
  questionId: string | null
  category: string
}

/** At most one open incident per archive (enforced by the partial unique index). */
export async function loadOpenIncident(archiveId: string): Promise<IncidentSession | null> {
  const { data, error } = await supabaseAdmin
    .from('incident_sessions')
    .select(INCIDENT_COLS)
    .eq('archive_id', archiveId)
    .eq('status', 'open')
    .maybeSingle()
  if (error) throw new Error(`loadOpenIncident failed: ${error.message}`)
  return data ? rowToSession(data as IncidentRow) : null
}

export async function createIncident(archiveId: string, seed: IncidentSeed): Promise<IncidentSession> {
  const { data, error } = await supabaseAdmin
    .from('incident_sessions')
    .insert({
      archive_id: archiveId,
      seed_question_id: seed.questionId,
      category: seed.category,
      phase: 'SEED',
      status: 'open',
      state: initialIncidentState(),
    })
    .select(INCIDENT_COLS)
    .single()
  if (error || !data) throw new Error(`createIncident failed: ${error?.message ?? 'no row returned'}`)
  return rowToSession(data as IncidentRow)
}

export async function persist(session: IncidentSession): Promise<void> {
  const { error } = await supabaseAdmin
    .from('incident_sessions')
    .update({
      phase: session.phase,
      status: session.status,
      state: session.state,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
  if (error) throw new Error(`persist failed: ${error.message}`)
}

export async function completeIncident(session: IncidentSession): Promise<void> {
  await persist({ ...session, phase: 'COMPLETE', status: 'complete' })
}

// ── Incident seed picker ──────────────────────────────────────────────────────
// Dedicated to the narrative incident seeds (b2b_questions.is_incident_seed =
// true), which selectNextQuestion deliberately excludes from the topic-question
// path. Rotates across categories by preferring a seed this archive has never
// run, then the least-recently-used one.
export async function pickIncidentSeed(
  archiveId: string,
): Promise<{ questionId: string; category: string; seedText: string } | null> {
  const { data: seeds } = await supabaseAdmin
    .from('b2b_questions')
    .select('id, category, question, order_index')
    .eq('is_incident_seed', true)
    .order('order_index', { ascending: true })
  if (!seeds || seeds.length === 0) return null

  const { data: priors } = await supabaseAdmin
    .from('incident_sessions')
    .select('seed_question_id, created_at')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })

  const lastUsedAt = new Map<string, number>()
  for (const p of priors ?? []) {
    const id = (p as { seed_question_id: string | null }).seed_question_id
    if (id && !lastUsedAt.has(id)) lastUsedAt.set(id, new Date((p as { created_at: string }).created_at).getTime())
  }

  // Unused seeds (never run) sort first via -Infinity; otherwise least-recent.
  const chosen = [...seeds].sort((a, b) => {
    const la = lastUsedAt.has(a.id) ? lastUsedAt.get(a.id)! : -Infinity
    const lb = lastUsedAt.has(b.id) ? lastUsedAt.get(b.id)! : -Infinity
    return la - lb
  })[0]

  return { questionId: chosen.id, category: chosen.category, seedText: chosen.question }
}
