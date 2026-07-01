import { describe, it, expect } from 'vitest'
import {
  advance,
  initialIncidentState,
  type IncidentSession,
  type ClassifierOut,
  type SaturationOut,
  type ProbeType,
} from './incidentSession'

// Classifier/saturation outputs are model-layer inputs; the reducer is pure, so
// the test simply hands canned ones in.
const cls = (over: Partial<ClassifierOut> = {}): ClassifierOut => ({
  anchor: '',
  containsRule: true,
  detour: 'NONE',
  branchComplete: false,
  tension: null,
  dimensionSignal: null,
  ...over,
})
const sat = (saturated = false): SaturationOut => ({ saturated })

function newSession(): IncidentSession {
  return {
    id: 't1',
    archiveId: 'a1',
    seedQuestionId: 'q1',
    category: 'Decision-Making',
    phase: 'SEED',
    status: 'open',
    state: initialIncidentState(),
  }
}

describe('advance — incident reducer', () => {
  it('does not mutate the session passed in (purity)', () => {
    const s0 = newSession()
    const before = JSON.stringify(s0)
    advance(s0, 'seed answer', cls(), sat())
    expect(JSON.stringify(s0)).toBe(before)
  })

  it('runs one full incident: detour insertion, saturation skip, and a re-probe', () => {
    let s = newSession()
    const emitted: (ProbeType | 'SEED' | 'TIMELINE')[] = []

    const step = (answer: string, c: ClassifierOut = cls(), sa: SaturationOut = sat()) => {
      const r = advance(s, answer, c, sa)
      s = r.session
      emitted.push(r.decision.probeType)
      return r.decision
    }

    // SEED answer -> TIMELINE probe
    step('seed answer')

    // Caller parses the timeline and populates two branches before continuing.
    s.state.branches = [
      { index: 0, summary: 'shipped without legal sign-off', chosen: 'ship', saturated: false },
      { index: 1, summary: 'cut the launch list', chosen: 'cut', saturated: false },
    ]

    // TIMELINE answer -> branch 0 CUE
    step('timeline answer')

    // ── Branch 0 spine: CUE, OPTION (with a sentiment-only re-probe), BASIS,
    //    an ANALOGUE detour, then BOUNDARY, ERROR ──────────────────────────────
    step('cue answer') // -> OPTION
    step('it just felt wrong', cls({ containsRule: false })) // sentiment-only -> re-probe OPTION
    step('the real reason was the deadline') // -> BASIS
    step('I weighed speed against being sure', cls({ detour: 'ANALOGUE', tension: 'speed vs thoroughness' }), sat(false)) // -> ANALOGUE detour
    step('a similar call back in 2009') // detour answer -> resume BOUNDARY
    step('I would not cross a safety line') // -> ERROR
    step('the time I misjudged the vendor') // ERROR answered -> branch 1 CUE

    // ── Branch 1 spine: CUE, OPTION, BASIS, then saturation skips BOUNDARY/ERROR ─
    step('cue answer b1') // -> OPTION
    step('option answer b1') // -> BASIS
    step('cost drove it', cls({ tension: 'cost vs quality' }), sat(true)) // BASIS saturated -> DIMENSIONS STAKE

    // ── Dimensions battery (branches name no one -> READ skipped) ─────────────
    step('protecting the client relationship') // STAKE -> CALIBRATION
    step('i was maybe sixty percent sure') // CALIBRATION -> GENERALIZE BOUNDARY

    // ── Generalize (rule-level) ───────────────────────────────────────────────
    step('general boundary answer') // -> ERROR (generalize)
    step('general error answer') // -> TRADEOFF #1

    // ── Tradeoff battery: 2 tensions collected -> 2 TRADEOFF probes ────────────
    step('tradeoff 1 answer') // -> TRADEOFF #2
    const last = step('tradeoff 2 answer') // -> COMPLETE

    // Emitted probe-type sequence for the whole incident.
    expect(emitted).toEqual([
      'TIMELINE',
      'CUE',
      'OPTION',
      'OPTION', // <- the sentiment-only re-probe (same type re-emitted once)
      'BASIS',
      'ANALOGUE', // <- detour inserted after BASIS
      'BOUNDARY', // <- spine resumes
      'ERROR',
      'CUE', // branch 1
      'OPTION',
      'BASIS',
      'STAKE', // <- saturation skipped branch 1's BOUNDARY/ERROR; DIMENSIONS battery opens
      'CALIBRATION', // <- READ skipped (branches name no one)
      'BOUNDARY', // rule-level GENERALIZE
      'ERROR', // rule-level GENERALIZE
      'TRADEOFF',
      'TRADEOFF',
      'TRADEOFF', // final decision (incidentComplete)
    ])

    expect(last.incidentComplete).toBe(true)
    expect(last.phaseAfter).toBe('COMPLETE')
    expect(s.phase).toBe('COMPLETE')

    // Branch 0 ran its full spine; branch 1 was saturated.
    expect(s.state.branches[0].saturated).toBe(false)
    expect(s.state.branches[1].saturated).toBe(true)

    // Tensions collected feed the (2-probe) tradeoff battery.
    expect(s.state.tensions).toEqual(['speed vs thoroughness', 'cost vs quality'])

    // Recorded probe history mirrors the emission order, one record per call.
    const recTypes = s.state.probeHistory.map(p => p.probeType)
    expect(recTypes).toEqual([
      'SEED',
      'TIMELINE',
      'CUE',
      'OPTION', // sentiment-only answer
      'OPTION', // accepted answer
      'BASIS',
      'ANALOGUE', // detour answer
      'BOUNDARY',
      'ERROR',
      'CUE',
      'OPTION',
      'BASIS',
      'STAKE', // dimensions battery
      'CALIBRATION', // dimensions battery (read skipped)
      'BOUNDARY', // generalize
      'ERROR', // generalize
      'TRADEOFF',
      'TRADEOFF',
    ])

    // Detour is attributed to branch 0 and sits between that branch's BASIS and BOUNDARY.
    const analogueIdx = recTypes.indexOf('ANALOGUE')
    expect(recTypes[analogueIdx - 1]).toBe('BASIS')
    expect(recTypes[analogueIdx + 1]).toBe('BOUNDARY')
    expect(s.state.probeHistory[analogueIdx].branchIndex).toBe(0)

    // The re-probe record (sentiment-only) keeps depositId null.
    expect(s.state.probeHistory[3].probeType).toBe('OPTION')
    expect(s.state.probeHistory[3].depositId).toBeNull()

    // Saturation skip: branch 1 produced only CUE/OPTION/BASIS, never its own BOUNDARY/ERROR.
    const branch1Types = s.state.probeHistory.filter(p => p.branchIndex === 1).map(p => p.probeType)
    expect(branch1Types).toEqual(['CUE', 'OPTION', 'BASIS'])

    // Dimensions: STAKE and CALIBRATION closed by their probes; READ stayed
    // unelicited because the branch summaries named no one. Budget held at 2.
    expect(s.state.dimensions).toEqual({ stake: 'substantive', read: 'unelicited', calibration: 'substantive' })
    expect(s.state.probeBudgetUsed).toBe(2)
  })

  it('falls closed to a single branch when the timeline yields none', () => {
    let s = newSession()
    let r = advance(s, 'seed', cls(), sat())
    s = r.session // phase TIMELINE, branches still empty
    r = advance(s, 'timeline', cls(), sat())
    s = r.session
    expect(s.state.branches).toHaveLength(1)
    expect(r.decision.probeType).toBe('CUE')
    expect(r.decision.branchIndexForProbe).toBe(0)
  })
})
