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
} from '../lib/incidentSession'

// ── Stubs (same shape as the Step 1 unit test) ───────────────────────────────

const cls = (over: Partial<ClassifierOut> = {}): ClassifierOut => ({
  anchor: '',
  containsRule: true,
  detour: 'NONE',
  branchComplete: false,
  tension: null,
  ...over,
})
const sat = (saturated = false): SaturationOut => ({ saturated })

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
  r.step('err1') // -> GENERALIZE BOUNDARY
  r.step('genBoundary') // -> GENERALIZE ERROR
  r.step('genError') // -> TRADEOFF #1
  r.step('tradeoff1') // -> TRADEOFF #2
  const last = r.step('tradeoff2') // -> COMPLETE

  assertSeq(
    r.emitted,
    [
      'TIMELINE', 'CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR',
      'CUE', 'OPTION', 'BASIS', 'BOUNDARY', 'ERROR',
      'BOUNDARY', 'ERROR', 'TRADEOFF', 'TRADEOFF', 'TRADEOFF',
    ],
    'emitted spine',
  )
  assertSeq(
    dedupe(r.phases),
    ['TIMELINE', 'DECISION_LOOP', 'GENERALIZE', 'TRADEOFF_BATTERY', 'COMPLETE'],
    'phase walk',
  )
  assert(last.incidentComplete === true, 'final decision must set incidentComplete')
  assert(r.session.phase === 'COMPLETE', `session must end COMPLETE, got ${r.session.phase}`)
  assert(
    r.session.state.branches.every(b => !b.saturated),
    'no branch should be saturated on the clean path',
  )
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
  assert(
    afterB1.probeType === 'BOUNDARY' && afterB1.phaseAfter === 'GENERALIZE' && afterB1.branchIndexForProbe === -1,
    `last-branch saturation must advance to GENERALIZE, got ${afterB1.probeType}/${afterB1.phaseAfter}@${afterB1.branchIndexForProbe}`,
  )
  assert(r.session.state.branches[1].saturated === true, 'branch 1 must be marked saturated')
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
