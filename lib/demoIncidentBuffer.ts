/**
 * Ephemeral demo capture buffer: pure transform.
 *
 * This is the incident interview turn cycle (see
 * app/api/archive/b2b-question/answer/route.ts) with EVERY write removed:
 *   ✗ owner_deposits insert          ✗ createTrainingPairFromDeposit
 *   ✗ classifyDeposit                ✗ question_history update
 *   ✗ persist / createIncident / completeIncident / loadOpenIncident
 *
 * The session is never loaded from or saved to incident_sessions. It is created
 * in memory, held by the browser (the buffer), and advanced by runDemoTurn. The
 * only DB touch in this module is a single READ-ONLY seed SELECT in pickDemoSeed.
 * The only model calls are classifyAnswer and parseTimeline, both read-only.
 * Saturation is always false: a demo prospect has no frozen entity, so nothing
 * can be saturated, and checkSaturation (which keys a real archives uuid) is
 * never called.
 *
 * Both the Guide-gated routes and the acceptance-gate drive script call these
 * functions, so the gate exercises the exact production path.
 */

import { randomUUID } from 'crypto'
import { supabaseAdmin } from './supabase-admin'
import {
  advance,
  deriveReadAnchor,
  initialIncidentState,
  type ClassifierOut,
  type DimensionName,
  type DimensionStatus,
  type IncidentSession,
  type ProbeType,
  type SaturationOut,
} from './incidentSession'
import { classifyAnswer, parseTimeline } from './incidentClassifier'
import { renderProbe } from './renderProbe'

// A synthetic archiveId always carries this prefix, so it can never collide with
// a real archives.id (a uuid). The turn route rejects any session whose archiveId
// does not start with it.
export const DEMO_ARCHIVE_PREFIX = 'demo:'

export interface DemoSeed { id: string | null; category: string; question: string }

export interface DemoProbe { probeType: string; question: string }

export interface DemoTurnResult {
  session:           IncidentSession
  answeredProbeType: ProbeType | 'SEED' | 'TIMELINE'
  reprobed:          boolean
  dimensions:        Record<DimensionName, DimensionStatus>
  dimensionTag?:     { dimension: DimensionName; status: DimensionStatus }
  nextProbe:         DemoProbe | null
  incidentComplete:  boolean
}

// Fallback seeds when the b2b_questions read is empty or fails. Copy rules:
// American English, short declarative sentences, no em dashes, no banned words.
const FALLBACK_SEEDS: DemoSeed[] = [
  { id: null, category: 'judgment', question: 'Tell me about a decision you made under real pressure that you would still defend today.' },
  { id: null, category: 'conflict', question: 'Tell me about a time you had to go against people you respected.' },
  { id: null, category: 'risk',     question: 'Tell me about the hardest call you made when the outcome was far from certain.' },
]

/** Read-only pick of a real incident seed. No archive filter, no rotation (a demo
 *  prospect has no history), no writes. Falls back to a hardcoded seed on empty or
 *  error, so the demo never blocks on a DB read. */
export async function pickDemoSeed(): Promise<DemoSeed> {
  let seed = FALLBACK_SEEDS[Math.floor(Math.random() * FALLBACK_SEEDS.length)]
  try {
    const { data: seeds } = await supabaseAdmin
      .from('b2b_questions')
      .select('id, category, question')
      .eq('is_incident_seed', true)
    if (seeds && seeds.length > 0) {
      const pick = seeds[Math.floor(Math.random() * seeds.length)] as { id: string; category: string; question: string }
      if (pick?.question) seed = { id: pick.id, category: pick.category, question: pick.question }
    }
  } catch {
    // keep the hardcoded fallback
  }
  return seed
}

/** Build a fresh transient session for a seed. Synthetic id + archiveId, never a
 *  real uuid. Persists nothing. */
export function startDemoSession(seed: DemoSeed): { session: IncidentSession; probe: DemoProbe } {
  const demoId = `${DEMO_ARCHIVE_PREFIX}${randomUUID()}`
  const state = initialIncidentState()
  const question = renderProbe({ probeType: 'SEED', anchor: '', seedText: seed.question })
  state.pendingProbeType = 'SEED'
  state.pendingQuestion = question
  state.pendingBranchIndex = -1

  const session: IncidentSession = {
    id:             demoId,
    archiveId:      demoId,
    seedQuestionId: seed.id,
    category:       seed.category,
    phase:          'SEED',
    status:         'open',
    state,
  }
  return { session, probe: { probeType: 'SEED', question } }
}

/** One interview turn against the transient buffer. Advances the reducer and
 *  renders the next probe. Writes nothing. `incident` is not mutated in place;
 *  advance clones it. */
export async function runDemoTurn(incident: IncidentSession, answer: string): Promise<DemoTurnResult> {
  const st = incident.state
  const probeType = (st.pendingProbeType ?? 'SEED') as ProbeType | 'SEED' | 'TIMELINE'
  const pendingQuestion = st.pendingQuestion ?? ''
  const branchIndex = st.pendingBranchIndex ?? -1
  const branchSummary = branchIndex >= 0 ? (st.branches[branchIndex]?.summary ?? '') : ''

  // Model layer (fails closed internally → a model outage yields a plain spine).
  const classifierOut: ClassifierOut = await classifyAnswer({
    probeType: probeType as ProbeType, // SEED/TIMELINE only feed the prompt label
    question: pendingQuestion,
    answer,
    branchSummary,
  })

  // TIMELINE: populate branches before advance (reducer falls closed to one).
  if (probeType === 'TIMELINE') {
    const parsed = await parseTimeline(answer)
    st.branches = parsed.branches.map((b, i) => ({ index: i, summary: b.summary, chosen: b.chosen, saturated: false }))
  }

  // No frozen entity in a demo → nothing can be saturated.
  const saturationOut: SaturationOut = { saturated: false }

  const reprobed =
    incident.phase === 'DECISION_LOOP' &&
    !st.pendingDetour &&
    classifierOut.containsRule === false &&
    st.reprobeUsedOnCurrent === false

  const { session: next, decision } = advance(incident, answer, classifierOut, saturationOut)

  const DIMS: DimensionName[] = ['stake', 'read', 'calibration']
  const closedDim = DIMS.find(
    d => incident.state.dimensions[d] === 'unelicited' && next.state.dimensions[d] !== 'unelicited',
  )
  const dimensionTag = closedDim
    ? { dimension: closedDim, status: next.state.dimensions[closedDim] }
    : undefined

  if (decision.incidentComplete) {
    next.state.pendingQuestion = undefined
    next.state.pendingProbeType = undefined
    next.state.pendingBranchIndex = undefined
    next.status = 'complete'
    next.phase = 'COMPLETE'
    return {
      session:           next,
      answeredProbeType: probeType,
      reprobed,
      dimensions:        next.state.dimensions,
      dimensionTag,
      nextProbe:         null,
      incidentComplete:  true,
    }
  }

  const tensionForTradeoff =
    decision.probeType === 'TRADEOFF' ? next.state.tensions[next.state.spineCursor] : undefined
  const anchor =
    decision.probeType === 'READ' ? deriveReadAnchor(next.state.branches) : classifierOut.anchor
  const nextText = renderProbe({ probeType: decision.probeType, anchor, tensionForTradeoff })
  next.state.pendingQuestion = nextText
  next.state.pendingProbeType = decision.probeType
  next.state.pendingBranchIndex = decision.branchIndexForProbe

  return {
    session:           next,
    answeredProbeType: probeType,
    reprobed,
    dimensions:        next.state.dimensions,
    dimensionTag,
    nextProbe:         { probeType: decision.probeType, question: nextText },
    incidentComplete:  false,
  }
}
