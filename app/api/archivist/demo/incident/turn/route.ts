import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { DEMO_ARCHIVE_PREFIX, runDemoTurn } from '@/lib/demoIncidentBuffer'
import type {
  DimensionName,
  DimensionStatus,
  IncidentSession,
  IncidentState,
  Phase,
} from '@/lib/incidentSession'

export const dynamic = 'force-dynamic'

const ONE_HOUR_MS = 60 * 60 * 1000
const ANSWER_MAX = 4000
const PROBE_HISTORY_CAP = 40 // bound model spend per demo session

// Ephemeral demo capture buffer: one interview turn.
//
// This route is thin: auth, rate limit, fail-closed validation of the
// browser-posted session, and the `demo:` archive guard. The write-free transform
// lives in lib/demoIncidentBuffer.ts (runDemoTurn), which the acceptance-gate
// drive script also calls, so the gate exercises the exact production path.

const VALID_PHASES: Phase[] = ['SEED', 'TIMELINE', 'DECISION_LOOP', 'DIMENSIONS', 'GENERALIZE', 'TRADEOFF_BATTERY', 'COMPLETE']
const VALID_DIM_STATUS: DimensionStatus[] = ['unelicited', 'substantive', 'not_a_factor']

/** Fail-closed validator for the client-posted session. Returns a normalized
 *  IncidentSession or null. A malformed body cannot reach the reducer. The
 *  archiveId prefix is enforced by the caller. */
function validateDemoSession(raw: unknown): IncidentSession | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (typeof s.id !== 'string' || typeof s.archiveId !== 'string') return null
  if (!VALID_PHASES.includes(s.phase as Phase)) return null
  if (s.status !== 'open' && s.status !== 'complete' && s.status !== 'abandoned') return null

  const rs = s.state
  if (!rs || typeof rs !== 'object') return null
  const st = rs as Record<string, unknown>
  if (!Array.isArray(st.branches) || !Array.isArray(st.probeHistory) || !Array.isArray(st.tensions)) return null
  if (typeof st.currentBranchIndex !== 'number' || typeof st.spineCursor !== 'number') return null

  const rawDims = (st.dimensions ?? {}) as Record<string, unknown>
  const normDim = (v: unknown): DimensionStatus =>
    VALID_DIM_STATUS.includes(v as DimensionStatus) ? (v as DimensionStatus) : 'unelicited'
  const dimensions: Record<DimensionName, DimensionStatus> = {
    stake:       normDim(rawDims.stake),
    read:        normDim(rawDims.read),
    calibration: normDim(rawDims.calibration),
  }

  const state: IncidentState = {
    branches:             st.branches as IncidentState['branches'],
    currentBranchIndex:   st.currentBranchIndex,
    spineCursor:          st.spineCursor,
    reprobeUsedOnCurrent: st.reprobeUsedOnCurrent === true,
    probeHistory:         st.probeHistory as IncidentState['probeHistory'],
    tensions:             (st.tensions as unknown[]).filter((t): t is string => typeof t === 'string'),
    pendingDetour:        (st.pendingDetour ?? null) as IncidentState['pendingDetour'],
    dimensions,
    probeBudgetUsed:      typeof st.probeBudgetUsed === 'number' ? st.probeBudgetUsed : 0,
    pendingQuestion:      typeof st.pendingQuestion === 'string' ? st.pendingQuestion : undefined,
    pendingProbeType:     st.pendingProbeType as IncidentState['pendingProbeType'],
    pendingBranchIndex:   typeof st.pendingBranchIndex === 'number' ? st.pendingBranchIndex : undefined,
  }

  return {
    id:             s.id,
    archiveId:      s.archiveId,
    seedQuestionId: typeof s.seedQuestionId === 'string' ? s.seedQuestionId : null,
    category:       typeof s.category === 'string' ? s.category : 'incident',
    phase:          s.phase as Phase,
    status:         s.status,
    state,
  }
}

export async function POST(req: NextRequest) {
  // ── Guard 1: Legacy Guide auth (admin-strength door) ─────────────────────────
  const guide = await getSessionUser()
  if (!guide?.archivistId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Rate limit ───────────────────────────────────────────────────────────────
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`demo-incident-turn:${ip}`, 120, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const answer = (typeof body.answer === 'string' ? body.answer.trim() : '').slice(0, ANSWER_MAX)
  if (answer.length < 2) {
    return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
  }

  const incident = validateDemoSession(body.session)
  if (!incident) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  // ── Guard 2: synthetic archive only ──────────────────────────────────────────
  // Structurally impossible for this route to address a real archive. Even a
  // crafted body cannot make the demo path read or write archive-scoped data.
  if (!incident.archiveId.startsWith(DEMO_ARCHIVE_PREFIX) || !incident.id.startsWith(DEMO_ARCHIVE_PREFIX)) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  // Bound per-session model spend.
  if (incident.state.probeHistory.length > PROBE_HISTORY_CAP) {
    return NextResponse.json({ error: 'This demo session has run its length.' }, { status: 400 })
  }

  // Already finished, nothing further to ask.
  if (incident.status !== 'open') {
    return NextResponse.json({
      session:           incident,
      answeredProbeType: null,
      reprobed:          false,
      dimensions:        incident.state.dimensions,
      nextProbe:         null,
      incidentComplete:  true,
    })
  }

  const result = await runDemoTurn(incident, answer)
  return NextResponse.json(result)
}
