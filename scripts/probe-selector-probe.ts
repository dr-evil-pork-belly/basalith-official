/**
 * Regression gate for the incident reducer's deterministic spine.
 *
 * Companion to scripts/two-layer-probe.ts and run the same way:
 *   npx tsx scripts/probe-selector-probe.ts
 *
 * This exercises advance() from lib/incidentSession.ts as a PURE function with
 * stubbed classifier/saturation outputs. No Anthropic calls, no DB, no env. The
 * Step 1 unit test proves one full incident; this is the committed standalone
 * gate that any future edit to the reducer must keep green. Each case prints
 * PASS/FAIL, the run ends with a summary line, and any failure exits non-zero so
 * this can sit in a pre-commit / pre-deploy habit and actually catch a drift.
 */

import {
  advance,
  initialIncidentState,
  type IncidentSession,
  type ClassifierOut,
  type SaturationOut,
  type ProbeType,
  type DimensionName,
  type DimensionStatus,
} from '../lib/incidentSession'

// ── Stubs (same shape as the Step 1 unit test) ───────────────────────────────

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

/** A dimension signal helper for the coverage cases. */
const dim = (
  dimension: DimensionName,
  status: 'substantive' | 'not_a_factor',
): ClassifierOut => cls({ dimensionSignal: { dimension, status } })

/** Build a session already parked in the DIMENSIONS phase, so the coverage cases
 *  can drive that leg directly without walking a whole incident first. `people`
 *  controls whether the branch summaries name anyone (READ is only askable when
 *  they do). */
function dimSession(opts: {
  people?: boolean
  dims?: Partial<Record<DimensionName, DimensionStatus>>
  budget?: number
}): IncidentSession {
  const state = initialIncidentState()
  state.branches = opts.people
    ? [{ index: 0, summary: 'Dana pushed back hard', chosen: 'held the line', saturated: false }]
    : [{ index: 0, summary: 'b0', chosen: 'c0', saturated: false }]
  state.currentBranchIndex = 1 // past the (single) branch
  state.dimensions = { read: 'unelicited', stake: 'unelicited', calibration: 'unelicited', ...opts.dims }
  state.probeBudgetUsed = opts.budget ?? 0
  return {
    id: 'gate', archiveId: 'a', seedQuestionId: 'q', category: 'Decision-Making',
    phase: 'DIMENSIONS', status: 'open', state,
  }
}

type Decision = ReturnType<typeof advance>['decision']
type EmittedType = ProbeType | 'SEED' | 'TIMELINE'

function newSession(): IncidentSession {
  return {
    id: 'gate',
    archiveId: 'a',
    seedQuestionId: 'q',
    category: 'Decision-Making',
    phase: 'SEED',
    status: 'open',
    state: initialIncidentState(),
  }
}

/** A small driver bound to one evolving session, recording what each call emits. */
function runner() {
  let s = newSession()
  const emitted: EmittedType[] = []
  const phases: string[] = []
  const decisions: Decision[] = []
  return {
    step(answer: string, c: ClassifierOut = cls(), sa: SaturationOut = sat()): Decision {
      const r = advance(s, answer, c, sa)
      s = r.session
      emitted.push(r.decision.probeType)
      phases.push(r.decision.phaseAfter)
      decisions.push(r.decision)
      return r.decision
    },
    /** The caller (timeline parser) sets branches before DECISION_LOOP begins. */
    setBranches(n: number) {
      s.state.branches = Array.from({ length: n }, (_, i) => ({
        index: i,
        summary: `b${i}`,
        chosen: `c${i}`,
        saturated: false,
      }))
    },
    get session() {
      return s
    },
    emitted,
    phases,
    decisions,
  }
}

// ── Assertion helpers ─────────────────────────────────────────────────────────

class CaseFail extends Error {}
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new CaseFail(msg)
}
function assertSeq(actual: readonly unknown[], expected: readonly unknown[], label: string): void {
  const ok = actual.length === expected.length && actual.every((x, i) => x === expected[i])
  assert(
    ok,
    `${label} diverged:\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`,
  )
}
function dedupe(a: string[]): string[] {
  return a.filter((x, i) => i === 0 || x !== a[i - 1])
}

const results: { name: string; ok: boolean; msg?: string }[] = []
function runCase(name: string, fn: () => void): void {
  try {
    fn()
    results.push({ name, ok: true })
    console.log(`PASS  ${name}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    results.push({ name, ok: false, msg })
    console.error(`FAIL  ${name}\n      ${msg}`)
  }
}

// ── Cases ─────────────────────────────────────────────────────────────────────

// 1. The full spine — canonical happy path, two branches, clean rule-bearing
//    answers, plus the SEED->...->COMPLETE phase walk.
function caseFullSpine() {
  const r = runner()
  r.step('seed') // SEED -> TIMELINE
  r.setBranches(2)
  r.step('timeline') // -> branch 0 CUE
  r.step('cue0') // -> OPTION
  r.step('opt0') // -> BASIS
  r.step('basis0', cls({ tension: 'speed vs certainty' })) // -> BOUNDARY
  r.step('bound0') // -> ERROR
  r.step('err0') // -> branch 1 CUE
  r.step('cue1') // -> OPTION
  r.step('opt1') // -> BASIS
  r.step('basis1', cls({ tension: 'cost vs quality' })) // -> BOUNDARY
  r.step('bound1') // -> ERROR
  r.step('err1') // last branch done -> DIMENSIONS STAKE
  r.step('stake') // -> CALIBRATION (READ skipped: b0/b1 name no one)
  r.step('calib') // dimensions drained -> GENERALIZE BOUNDARY
  r.step('genBoundary') // -> GENERALIZE ERROR
  r.step('genError') // -> TRADEOFF #1
  r.step('tradeoff1') // -> TRADEOFF #2
  const last = r.step('tradeoff2') // -> COMPLETE

  assertSeq(
    r.emitted,
    [
      'TIMELINE', 'CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR',
      'CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR',
      'STAKE', 'CALIBRATION',
      'BOUNDARY', 'ERROR', 'TRADEOFF', 'TRADEOFF', 'TRADEOFF',
    ],
    'emitted spine',
  )
  assertSeq(
    dedupe(r.phases),
    ['TIMELINE', 'DECISION_LOOP', 'DIMENSIONS', 'GENERALIZE', 'TRADEOFF_BATTERY', 'COMPLETE'],
    'phase walk',
  )
  assert(last.incidentComplete === true, 'final decision must set incidentComplete')
  assert(r.session.phase === 'COMPLETE', `session must end COMPLETE, got ${r.session.phase}`)
  assert(
    r.session.state.branches.every(b => !b.saturated),
    'no branch should be saturated on the clean path',
  )
  // Dimensions: stake + calibration closed by their probes; read stayed unelicited
  // because no one was named. Budget spent exactly on the two probes that fired.
  const dims = r.session.state.dimensions
  assert(dims.stake === 'substantive', `stake should be substantive, got ${dims.stake}`)
  assert(dims.calibration === 'substantive', `calibration should be substantive, got ${dims.calibration}`)
  assert(dims.read === 'unelicited', `read should stay unelicited (no people), got ${dims.read}`)
  assert(r.session.state.probeBudgetUsed === 2, `probeBudgetUsed should be 2, got ${r.session.state.probeBudgetUsed}`)
}

// 2. One detour insertion — ANALOGUE on an accepted branch-1 BASIS answer inserts
//    exactly one ANALOGUE probe, attributed to branch 1, and the spine resumes at
//    BOUNDARY (the position it advanced to), not OPTION/BASIS (where it was).
function caseDetour() {
  const r = runner()
  r.step('seed')
  r.setBranches(2)
  r.step('timeline') // CUE b0
  r.step('cue0'); r.step('opt0'); r.step('basis0'); r.step('bound0'); r.step('err0') // finish b0 -> CUE b1
  r.step('cue1') // OPTION b1
  r.step('opt1') // BASIS b1
  const detour = r.step('basis1', cls({ detour: 'ANALOGUE' })) // -> ANALOGUE
  const resume = r.step('analogueAnswer') // -> BOUNDARY (resume)
  // Drive to completion so we can assert ANALOGUE appears exactly once overall.
  r.step('bound1'); r.step('err1'); r.step('genBoundary'); r.step('genError')
  r.step('tradeoff1') // single tradeoff (no tensions) -> COMPLETE

  assert(
    r.emitted.filter(p => p === 'ANALOGUE').length === 1,
    `exactly one ANALOGUE expected, got ${r.emitted.filter(p => p === 'ANALOGUE').length}`,
  )
  assert(detour.probeType === 'ANALOGUE', `detour decision should be ANALOGUE, got ${detour.probeType}`)
  assert(detour.branchIndexForProbe === 1, `detour must be attributed to branch 1, got ${detour.branchIndexForProbe}`)
  assert(
    resume.probeType === 'BOUNDARY' && resume.branchIndexForProbe === 1,
    `spine must resume at BOUNDARY of branch 1, got ${resume.probeType}@${resume.branchIndexForProbe}`,
  )
  const analogueRec = r.session.state.probeHistory.find(p => p.probeType === 'ANALOGUE')
  assert(!!analogueRec, 'ANALOGUE must be recorded in probeHistory')
  assert(analogueRec!.branchIndex === 1, `ANALOGUE record branchIndex must be 1, got ${analogueRec!.branchIndex}`)
}

// 3. One saturation skip — sat(true) at BASIS->next marks the branch saturated and
//    skips BOUNDARY/ERROR, advancing to the next branch; and when the LAST branch
//    saturates, it advances to GENERALIZE.
function caseSaturationSkip() {
  const r = runner()
  r.step('seed')
  r.setBranches(2)
  r.step('timeline') // CUE b0
  r.step('cue0') // OPTION
  r.step('opt0') // BASIS
  const afterB0 = r.step('basis0', cls(), sat(true)) // saturated -> skip to next branch CUE
  r.step('cue1') // OPTION b1
  r.step('opt1') // BASIS b1
  const afterB1 = r.step('basis1', cls(), sat(true)) // last branch saturated -> GENERALIZE

  assert(
    afterB0.probeType === 'CUE' && afterB0.branchIndexForProbe === 1,
    `branch 0 saturation must jump to branch 1 CUE, got ${afterB0.probeType}@${afterB0.branchIndexForProbe}`,
  )
  assert(r.session.state.branches[0].saturated === true, 'branch 0 must be marked saturated')
  // BASIS was directly followed by CUE: BOUNDARY and ERROR of branch 0 were skipped.
  assertSeq(r.emitted.slice(0, 5), ['TIMELINE', 'CUE', 'OPTION', 'BASIS', 'CUE'], 'branch-0 saturation skip')
  // Last-branch saturation still skips its own BOUNDARY/ERROR, but now advances
  // into the DIMENSIONS battery (STAKE first) before GENERALIZE, not straight to it.
  assert(
    afterB1.probeType === 'STAKE' && afterB1.phaseAfter === 'DIMENSIONS' && afterB1.branchIndexForProbe === -1,
    `last-branch saturation must advance into DIMENSIONS/STAKE, got ${afterB1.probeType}/${afterB1.phaseAfter}@${afterB1.branchIndexForProbe}`,
  )
  assert(r.session.state.branches[1].saturated === true, 'branch 1 must be marked saturated')
  // Draining the dimensions (no people -> stake then calibration) reaches GENERALIZE.
  r.step('stake') // -> CALIBRATION
  const toGeneralize = r.step('calib') // -> GENERALIZE BOUNDARY
  assert(
    toGeneralize.probeType === 'BOUNDARY' && toGeneralize.phaseAfter === 'GENERALIZE',
    `dimensions drained must reach GENERALIZE, got ${toGeneralize.probeType}/${toGeneralize.phaseAfter}`,
  )
}

// 4. One re-probe, capped — a containsRule:false answer re-emits the same probe
//    once; a second containsRule:false is accepted and advances.
function caseReprobeCapped() {
  const r = runner()
  r.step('seed')
  r.setBranches(1)
  r.step('timeline') // CUE
  r.step('cue') // -> OPTION
  const reprobe = r.step('sentiment only', cls({ containsRule: false })) // -> OPTION again (re-probe)
  const reprobeFlag = r.session.state.reprobeUsedOnCurrent
  const advanceAnyway = r.step('still sentiment', cls({ containsRule: false })) // -> BASIS (accepted)

  assert(reprobe.probeType === 'OPTION', `first sentiment-only must re-emit OPTION, got ${reprobe.probeType}`)
  assert(reprobeFlag === true, 'reprobeUsedOnCurrent must be set after the re-probe')
  assert(advanceAnyway.probeType === 'BASIS', `second sentiment-only must advance to BASIS, got ${advanceAnyway.probeType}`)
  // Exactly two OPTION emissions (initial + one re-probe), then BASIS. Never a third.
  assertSeq(r.emitted, ['TIMELINE', 'CUE', 'OPTION', 'OPTION', 'BASIS'], 're-probe cap')
}

// 5. Fall-closed to one branch — empty branches after TIMELINE yields a single
//    branch starting at CUE (the safety net for a timeline parse failure).
function caseFallClosedSingleBranch() {
  const r = runner()
  r.step('seed') // -> TIMELINE
  const d = r.step('timeline narrative with no parseable branches') // branches left empty

  assert(r.session.state.branches.length === 1, `expected 1 fallback branch, got ${r.session.state.branches.length}`)
  assert(d.probeType === 'CUE', `fallback must start at CUE, got ${d.probeType}`)
  assert(d.branchIndexForProbe === 0, `fallback branch index must be 0, got ${d.branchIndexForProbe}`)
}

// 6. Dimensions entry — a clean single-branch spine, all dimensions unelicited and
//    budget 0, routes into DIMENSIONS and picks STAKE first (order stake, read,
//    calibration).
function caseDimensionsPicksStake() {
  const r = runner()
  r.step('seed')
  r.setBranches(1)
  r.step('timeline') // CUE
  r.step('cue'); r.step('opt'); r.step('basis'); r.step('bound') // -> ERROR
  const d = r.step('err') // last branch done -> DIMENSIONS
  assert(d.probeType === 'STAKE', `first dimension must be STAKE, got ${d.probeType}`)
  assert(d.phaseAfter === 'DIMENSIONS', `phase must be DIMENSIONS, got ${d.phaseAfter}`)
  assert(r.session.state.probeBudgetUsed === 0, 'entering DIMENSIONS spends no budget yet')
}

// 7. STAKE substantive -> READ. With people named, closing STAKE advances to READ
//    (next in order), not calibration.
function caseStakeThenRead() {
  const s = dimSession({ people: true }) // Dana named -> READ askable
  const { session, decision } = advance(s, 'protecting the team', dim('stake', 'substantive'), sat())
  assert(decision.probeType === 'READ', `after STAKE substantive, next is READ, got ${decision.probeType}`)
  assert(session.state.dimensions.stake === 'substantive', 'stake must be substantive')
  assert(session.state.probeBudgetUsed === 1, `one probe spent, got ${session.state.probeBudgetUsed}`)
}

// 8. Budget exhausted -> exit to GENERALIZE, remaining dimensions left 'unelicited'
//    with nothing synthesized (graceful partial).
function caseBudgetExhaustedExits() {
  const s = dimSession({ budget: 2 }) // one probe left before the cap
  const { session, decision } = advance(s, 'the numbers', dim('stake', 'substantive'), sat())
  assert(session.state.probeBudgetUsed === 3, `budget must hit 3, got ${session.state.probeBudgetUsed}`)
  assert(
    decision.phaseAfter === 'GENERALIZE' && decision.probeType === 'BOUNDARY',
    `budget cap must exit to GENERALIZE, got ${decision.probeType}/${decision.phaseAfter}`,
  )
  assert(session.state.dimensions.read === 'unelicited', 'read left unelicited (not synthesized)')
  assert(session.state.dimensions.calibration === 'unelicited', 'calibration left unelicited (not synthesized)')
}

// 9. A not_a_factor close advances coverage and is not re-probed (negative space).
function caseNotAFactorAdvances() {
  const s = dimSession({}) // no people -> read not askable
  const first = advance(s, 'nothing was really at stake', dim('stake', 'not_a_factor'), sat())
  assert(first.session.state.dimensions.stake === 'not_a_factor', 'stake must close as not_a_factor')
  assert(first.decision.probeType === 'CALIBRATION', `must advance past stake, got ${first.decision.probeType}`)
  // Closing calibration exits; stake is never asked again.
  const second = advance(first.session, 'i was sure', dim('calibration', 'substantive'), sat())
  assert(second.session.state.dimensions.stake === 'not_a_factor', 'stake stays not_a_factor (never re-probed)')
  assert(second.decision.phaseAfter === 'GENERALIZE', `dimensions done -> GENERALIZE, got ${second.decision.phaseAfter}`)
}

// 10. READ with no named people is skipped, not fired nameless. STAKE closes, then
//     the reducer jumps to CALIBRATION; READ is never emitted and stays unelicited.
function caseReadSkippedNoPeople() {
  const s = dimSession({}) // b0/c0 name no one
  const emitted: string[] = []
  const afterStake = advance(s, 'protecting runway', dim('stake', 'substantive'), sat())
  emitted.push(afterStake.decision.probeType)
  const afterCalib = advance(afterStake.session, 'a coin flip honestly', dim('calibration', 'substantive'), sat())
  emitted.push(afterCalib.decision.probeType)
  assert(!emitted.includes('READ'), `READ must never be emitted without people, emitted ${JSON.stringify(emitted)}`)
  assert(emitted[0] === 'CALIBRATION', `after STAKE with no people, next is CALIBRATION, got ${emitted[0]}`)
  assert(afterCalib.session.state.dimensions.read === 'unelicited', 'read stays unelicited when no one is named')
  assert(afterCalib.decision.phaseAfter === 'GENERALIZE', 'dimensions exhausted -> GENERALIZE')
}

// ── Run ───────────────────────────────────────────────────────────────────────

function main(): number {
  console.log('='.repeat(72))
  console.log('probe-selector-probe — incident reducer regression gate (pure, no model/DB)')
  console.log('='.repeat(72))

  runCase('full spine (SEED -> TIMELINE -> DECISION_LOOP -> GENERALIZE -> TRADEOFF_BATTERY -> COMPLETE)', caseFullSpine)
  runCase('detour insertion (one ANALOGUE, correct branch, resumes at BOUNDARY)', caseDetour)
  runCase('saturation skip (BASIS saturated -> skip BOUNDARY/ERROR -> next branch / GENERALIZE)', caseSaturationSkip)
  runCase('re-probe capped (one re-emit per position, then accept)', caseReprobeCapped)
  runCase('fall-closed to a single branch (empty timeline -> one branch at CUE)', caseFallClosedSingleBranch)
  runCase('dimensions entry (last branch done -> DIMENSIONS picks STAKE)', caseDimensionsPicksStake)
  runCase('stake substantive -> read (order stake, read, calibration)', caseStakeThenRead)
  runCase('budget cap (3 probes -> exit GENERALIZE, remaining left unelicited)', caseBudgetExhaustedExits)
  runCase('not_a_factor close advances and is never re-probed', caseNotAFactorAdvances)
  runCase('read skipped when no people are named (never fired nameless)', caseReadSkippedNoPeople)

  const failed = results.filter(r => !r.ok).length
  console.log('\n' + '-'.repeat(72))
  console.log(`probe-selector-probe: ${results.length - failed}/${results.length} passed`)
  return failed
}

try {
  const failed = main()
  process.exit(failed ? 1 : 0)
} catch (err) {
  console.error('probe-selector-probe crashed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
