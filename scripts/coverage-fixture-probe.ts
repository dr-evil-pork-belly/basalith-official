/**
 * Fixture validation for the coverage map. Ships nothing.
 *
 * WHY THIS EXISTS. This is the only point in the coverage build where the
 * correct answer is known in advance. The demo personas are in-code, fixed, and
 * each carries a designed-to-refuse chip, which means each has a documented
 * hole. Running the map against a real archive tells you what the map SAYS. It
 * cannot tell you whether the map is RIGHT, because nobody knows the ground
 * truth of a real archive. Here we do.
 *
 * GATE 1 HAS BEEN WRONG TWICE. Both mistakes are recorded because the second one
 * was caused by overcorrecting the first.
 *
 * Attempt one asserted `backed < 8`. Margaret returned 0 of 8 backed and it
 * PASSED. A gate that cannot tell discrimination from uniform failure is not a
 * gate, and it reported green over a broken artifact.
 *
 * Attempt two added a floor: at least one domain must read `backed`. That gate
 * can never pass, and not because of the probes. `backed` requires every probe
 * in a domain to land on a deposit, and the succession route caps the frozen
 * layer at 20 training pairs, which is two to three per domain across eight.
 * Six of six is unreachable for any archive at any density. The gate was
 * measuring a threshold artifact, not the map.
 *
 * Attempt three tests the property that was actually wanted the whole time: does
 * the map say DIFFERENT things about different domains. That is spread, it is
 * independent of where the state thresholds sit, and it is reachable.
 *
 * THE GATES.
 *
 *   GATE 1  Discrimination, by deposit spread between the best and worst domain.
 *           A map that says the same thing everywhere is measuring the probes,
 *           not the archive. Paired with a ceiling so a rubber-stamping verifier
 *           still fails.
 *   GATE 2  Not everything open. The inverse failure stated separately so the
 *           output says which way it broke.
 *   GATE 3  Margaret's Capital reads open. She has fifteen deposits and none of
 *           them touches capital allocation, so this is the cleanest documented
 *           hole in either fixture.
 *   GATE 6  Cross fixture. Margaret's Capital must read strictly lower than
 *           Joey's, because he has capital deposits and she has none. See the
 *           note on GATE 6 below for why this replaced Joey's GATE 3.
 *   GATE 4  Domain stability. At most one of eight domains may change state
 *           across two identical runs.
 *   GATE 5  The overreach dimension is alive. At least one domain must report a
 *           level other than 'none', or the second dimension is not measuring
 *           anything and the column is decoration.
 *
 * The personas hold no real archive data and nothing here writes to any table.
 *
 * ── 2026-08-19, slice 2.2. THE FORK IS GONE ─────────────────────────────────
 *
 * This file used to claim the map was computed through the same core the Inngest
 * job uses. That was only half true and the half that was false is the half that
 * mattered. Roll-up came from lib/coverage.ts, shared. But the RUN did not: a
 * local `probeOnce` reimplemented runCoverage's probe loop by hand, under a
 * comment reading "Mirrors lib/coverageRun.ts exactly" over four re-declared
 * constants. So every gate below judged code that does not deploy.
 *
 * A diff before collapsing it found the constants and the verifier handling
 * genuinely identical, and two differences that were not:
 *
 *   Probe failure. runCoverage catches a failed probe and continues with a short
 *   set. probeOnce had no catch and aborted the whole run with exit 2. Both are
 *   right for their own caller, so the behavior now lives in runFixturePass
 *   rather than in the shipped path. See the note there.
 *
 *   Frozen layer size. runCoverage capped at 20 pairs, probeOnce passed personas
 *   whole. Both personas hold 15, so the paths agreed by coincidence rather than
 *   by construction. The cap now applies to every source in runCoverage, and
 *   assertPersonasUnderCap keeps it from engaging where it would truncate by
 *   arbitrary array order.
 *
 * Runs now go through runCoverage with content injected and an in-memory store,
 * so a green fixture and a shipped map cannot diverge. Figures produced before
 * this change are NOT comparable to figures produced after it, because the code
 * under measurement is not the same code.
 *
 * Run: npx tsx scripts/coverage-fixture-probe.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { margaretChen } from '../lib/demoPersonas/margaretChen'
import { joey } from '../lib/demoPersonas/joey'
import type { DemoPersona } from '../lib/demoPersonas/types'
import { COVERAGE_PROBES, PROBE_SET_VERSION } from '../lib/coverageProbes'
import { rollUpRun, domainStateDrift, depositSpread, type ProbeResult, type DomainRollup } from '../lib/coverage'
import { runCoverage, FROZEN_LAYER_LIMIT, type CoverageContent } from '../lib/coverageRun'
import { createInMemoryCoverageStore } from '../lib/coverageStoreMemory'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

/** GATE 4 threshold. One of eight domains may move; two means the map is noise. */
const MAX_DOMAIN_DRIFT = 1

/**
 * GATE 1 threshold, in probes, between the best and worst covered domain.
 *
 * WHY SPREAD AND NOT A `backed` COUNT. The previous gate asserted at least one
 * domain must read `backed`. That can never pass, and not because of the probes.
 * `backed` requires every probe in a domain to land on a deposit, and the
 * succession route caps the frozen layer at 20 training pairs. Across eight
 * domains that is two to three pairs per domain, so six of six is unreachable
 * for ANY archive however dense, and doubly so for a fifteen deposit fixture.
 * A gate keyed to an unreachable state reports nothing when it fails.
 *
 * What the map has to do is say DIFFERENT things about different domains. Spread
 * tests that directly and does not move when the state thresholds move, which
 * matters because those thresholds are not calibrated yet.
 *
 * Three of six is the bar because Margaret's Capital hole and her People
 * coverage are the clearest true positive and true negative in the fixture, and
 * a map that cannot separate those two by half its probes is not reading the
 * archive.
 */
const MIN_DEPOSIT_SPREAD = 3

/**
 * Margaret's documented hole. "Should the firm add a private equity sleeve for
 * clients?" is an allocation question, and none of her fifteen deposits touches
 * capital allocation. Her nearest neighbors are discounting (Strategy) and
 * client concentration (Risk). Measured 0 of 6 on two consecutive runs.
 *
 * WHY JOEY NO LONGER HAS ONE. His refuse chip is a third party delivery app,
 * which is a channel question and therefore Strategy. But Strategy is his
 * BEST covered domain, measured at 5 of 6 and 4 of 6, because he has real
 * deposits on price matching, shelf placement, and what he will not stock. So
 * "Joey's Strategy is not backed" passed only because 5 is not 6. That is a
 * technicality, not a test: it would flip to failing the moment the backed
 * threshold moved, for a reason that has nothing to do with map quality.
 *
 * Deleting a gate that passes vacuously is not weakening the suite. Keeping it
 * would have meant reporting two independent checks when only one existed.
 * GATE 6 replaces it with something Joey's deposits actually make testable.
 */
const MARGARET_HOLE = 'Capital'

/**
 * A persona, shaped as the shipped core reads an archive.
 *
 * `segment` is 'succession' because these are succession-shaped B2B founders and
 * the b2b probe set is therefore ON label for them. off_label means the probe set
 * does not match the segment, and nothing else. It is NOT a fixture flag: fiction
 * is kept apart from reality by which store a run is given, not by a boolean, and
 * setting this true would overload the column with a second meaning and make every
 * future query on it ambiguous.
 */
function personaContent(persona: DemoPersona): CoverageContent {
  return {
    ownerName:   persona.metadata.name,
    archiveName: persona.archiveName,
    segment:     'succession',
    pairs:       persona.pairs,
  }
}

/**
 * The cap must never silently engage here.
 *
 * lib/coverageRun.ts truncates every content source to FROZEN_LAYER_LIMIT so the
 * fixture cannot measure a frozen layer larger than the one a successor receives.
 * The archive path orders by quality_score before truncating. A persona has no
 * such column, so if one ever grew past the cap, WHICH pairs survived would be
 * decided by array order, which carries no meaning. The gates would then be
 * reading an arbitrary subset and would not say so.
 *
 * So the cap defends the general case and this assertion guarantees it stays
 * unreached on the one path where the ordering would be meaningless.
 */
function assertPersonasUnderCap(personas: DemoPersona[]): void {
  for (const p of personas) {
    if (p.pairs.length > FROZEN_LAYER_LIMIT) {
      throw new Error(
        `persona ${p.metadata.id} holds ${p.pairs.length} pairs, over FROZEN_LAYER_LIMIT ` +
        `of ${FROZEN_LAYER_LIMIT}. The cap would truncate by array order, which is arbitrary ` +
        `for a persona. Trim the persona or give it an explicit ranking before running gates.`,
      )
    }
  }
}

/**
 * One fixture pass, through the SHIPPED core.
 *
 * Before slice 2.2 this function was a hand-written copy of runCoverage's probe
 * loop, so every gate below judged code that does not deploy. It now calls the
 * real thing with content injected and an in-memory store, which is why a green
 * fixture and a shipped map can no longer diverge.
 *
 * THE EXIT-2 CONTRACT LIVES HERE, DELIBERATELY, AND NOT IN runCoverage.
 *
 * runCoverage catches a probe that exhausts its retries, records it as a miss,
 * and carries on with a short result set. That is correct for the monthly sweep,
 * where a degraded map beats no map. It is wrong for a gate suite: the six gates
 * below divide by per-domain probe counts, so a dropped probe silently changes a
 * denominator and the suite would report a verdict on a set it did not fully
 * measure. That is the failure exit code 2 exists to prevent.
 *
 * Which behavior is right is a property of what the CALLER is doing, not of the
 * run, so it is enforced here rather than added to the shipped path as a flag
 * only one caller would ever set.
 *
 * Length is checked rather than `complete`, because length is the primitive the
 * gate denominators actually depend on and `complete` is derived from it. Both
 * are checked anyway, since it costs nothing, and the message names which fired.
 */
async function runFixturePass(persona: DemoPersona, label: string): Promise<ProbeResult[]> {
  const { store } = createInMemoryCoverageStore({
    runId: `fixture:${persona.metadata.id}:${label}`,
  })

  const result = await runCoverage({
    archiveId:     `fixture:${persona.metadata.id}`,
    triggerSource: 'manual',
    content:       personaContent(persona),
    store,
    // + deposit, ! reached past, . declined, x verifier failed and was discarded
    onProbe: (r) => process.stdout.write(
      r.verifierErrored ? 'x' : r.basis === 'deposit' ? '+' : r.basis === 'unsupported' ? '!' : '.',
    ),
  })

  process.stdout.write('\n')

  if ('skipped' in result) {
    throw new Error(`${persona.metadata.id} ${label}: the run never opened (${result.skipped})`)
  }

  const expected    = COVERAGE_PROBES.length
  const shortSet    = result.results.length !== expected
  const notComplete = !result.complete

  if (shortSet || notComplete) {
    const fired = [
      shortSet    ? `results.length ${result.results.length} of ${expected}` : null,
      notComplete ? 'complete=false'                                        : null,
    ].filter(Boolean).join(' and ')

    throw new Error(
      `${persona.metadata.id} ${label}: incomplete run, ${fired}. ` +
      `${result.error ? `Last probe error: ${result.error}. ` : ''}` +
      `A gate suite cannot judge a short set, because every gate below divides by a ` +
      `per-domain probe count. The map is UNJUDGED, not wrong.`,
    )
  }

  return result.results
}

function printMap(label: string, rollups: DomainRollup[]): void {
  console.log(`\n  ${label}`)
  for (const r of rollups) {
    const bar = r.state === 'backed' ? '###' : r.state === 'partial' ? '## ' : '   '
    console.log(
      `    ${bar}  ${r.domain.padEnd(16)} ${r.state.padEnd(8)}` +
      ` ${r.probesDeposit}/${r.probesTotal} deposit` +
      `  reach=${r.overreach.padEnd(4)} (${r.probesOverreach} over, ${r.probesDeclined} declined` +
      `${r.probesErrored ? `, ${r.probesErrored} discarded` : ''})`,
    )
  }
}

type Outcome = { label: string; pass: boolean; detail: string }

async function runPersona(persona: DemoPersona): Promise<{ outcomes: Outcome[]; map: DomainRollup[] }> {
  const name = persona.metadata.name
  console.log('')
  console.log('='.repeat(84))
  console.log(`${name.toUpperCase()}  (${persona.pairs.length} fictional deposits, probe set ${PROBE_SET_VERSION})`)
  console.log('='.repeat(84))

  // No prompt assembly here. runCoverage builds it from the injected content
  // using the same buildEntitySystemPrompt the succession route uses, so there is
  // no second copy left in this file to drift from the shipped one.
  console.log(`\n  run 1 (${COVERAGE_PROBES.length} probes. + deposit, ! reached past, . declined, x discarded)`)
  const first = await runFixturePass(persona, 'run1')
  const mapA  = rollUpRun(first)
  printMap('run 1 map', mapA)

  console.log(`\n  run 2 (stability check)`)
  const second = await runFixturePass(persona, 'run2')
  const mapB   = rollUpRun(second)
  printMap('run 2 map', mapB)

  const secondByKey = new Map(second.map(r => [r.probeKey, r.basis]))
  const probeDrift  = first.filter(r => secondByKey.get(r.probeKey) !== r.basis)
  const stateDrift  = domainStateDrift(mapA, mapB)

  const spread  = depositSpread(mapA)
  const errored = mapA.reduce((n, r) => n + r.probesErrored, 0)
  const backed  = mapA.filter(r => r.state === 'backed').length
  const open    = mapA.filter(r => r.state === 'open').length
  const reaching = mapA.filter(r => r.overreach !== 'none').length

  console.log('')
  console.log(`  probe drift: ${probeDrift.length} of ${first.length} probes changed basis`)
  for (const d of probeDrift) {
    console.log(`    ${d.probeKey.padEnd(16)} ${d.basis} -> ${secondByKey.get(d.probeKey)}`)
  }
  console.log(`  domain drift: ${stateDrift.length} of ${mapA.length} domains changed state` +
    (stateDrift.length ? `  [${stateDrift.join(', ')}]` : ''))
  console.log(`  deposit spread: ${spread} of ${COVERAGE_PROBES.length / mapA.length} probes between best and worst domain`)
  if (errored) console.log(`  discarded: ${errored} verifier failsafe verdicts, excluded from both dimensions`)

  const outcomes: Outcome[] = [
    {
      label:  `${name} GATE 1 discriminates between domains`,
      pass:   spread >= MIN_DEPOSIT_SPREAD && backed < mapA.length,
      detail: `deposit spread ${spread} of ${COVERAGE_PROBES.length / mapA.length} probes` +
        ` (best ${Math.max(...mapA.map(r => r.probesDeposit))}, worst ${Math.min(...mapA.map(r => r.probesDeposit))}),` +
        ` threshold ${MIN_DEPOSIT_SPREAD}. ${backed} of ${mapA.length} backed.`,
    },
    {
      label:  `${name} GATE 2 not everything is open`,
      pass:   open < mapA.length,
      detail: `${open} of ${mapA.length} domains open`,
    },
    {
      label:  `${name} GATE 4 domain state is stable across identical runs`,
      pass:   stateDrift.length <= MAX_DOMAIN_DRIFT,
      detail: `${stateDrift.length} domains moved, threshold ${MAX_DOMAIN_DRIFT}` +
        ` (${probeDrift.length}/${first.length} probes drifted, which is expected)`,
    },
    {
      label:  `${name} GATE 5 the overreach dimension is measuring something`,
      pass:   reaching >= 1,
      detail: `${reaching} of ${mapA.length} domains report reaching past the archive`,
    },
  ]

  // Margaret only. Joey has no domain his deposits leave genuinely empty, so
  // asserting one for him produced a gate that passed on a technicality.
  if (persona.metadata.id === 'margaret') {
    const hole = mapA.find(r => r.domain === MARGARET_HOLE)
    outcomes.push({
      label:  `${name} GATE 3 the documented hole (${MARGARET_HOLE}) reads open`,
      pass:   hole ? hole.state === 'open' : false,
      detail: hole
        ? `${MARGARET_HOLE} read ${hole.state} at ${hole.probesDeposit}/${hole.probesTotal}`
        : `${MARGARET_HOLE} missing from the map`,
    })
  }

  return { outcomes, map: mapA }
}

async function main() {
  console.log('COVERAGE FIXTURE PROBE')
  console.log(`probe set ${PROBE_SET_VERSION}, ${COVERAGE_PROBES.length} probes, ${COVERAGE_PROBES.length * 2} model calls per run`)
  console.log('Fictional personas, known ground truth, nothing written to any table.')
  console.log('Runs through lib/coverageRun.ts, the same core the Inngest job runs.')

  // Before any model call, because a cap that engaged silently would make every
  // figure below a reading of an arbitrary subset. See assertPersonasUnderCap.
  assertPersonasUnderCap([margaretChen, joey])
  console.log(`frozen layer cap ${FROZEN_LAYER_LIMIT}, personas at ${margaretChen.pairs.length} and ${joey.pairs.length} pairs, cap unreached.`)

  const m = await runPersona(margaretChen)
  const j = await runPersona(joey)

  // ── GATE 6, the cross fixture check ─────────────────────────────────────────
  // The strongest assertion available, because it uses known ground truth on BOTH
  // sides and depends on no threshold at all.
  //
  // Margaret has zero capital allocation deposits. Joey has two that are squarely
  // capital: whether to open a new store or reinvest in an existing one, and why
  // he bought the building at store one. So the map must read Capital lower for
  // her than for him. If it does not, the map is not reading archives, it is
  // reading the probe set, and every other gate here could still pass while that
  // was true.
  const mCap = m.map.find(r => r.domain === MARGARET_HOLE)!
  const jCap = j.map.find(r => r.domain === MARGARET_HOLE)!

  const outcomes: Outcome[] = [
    ...m.outcomes,
    ...j.outcomes,
    {
      label:  `GATE 6 cross fixture: Margaret has less ${MARGARET_HOLE} coverage than Joey`,
      pass:   mCap.probesDeposit < jCap.probesDeposit,
      detail: `Margaret ${mCap.probesDeposit}/${mCap.probesTotal} vs Joey ${jCap.probesDeposit}/${jCap.probesTotal}.` +
        ` She has no capital allocation deposits; he has two.`,
    },
  ]

  console.log('')
  console.log('='.repeat(84))
  console.log('SUMMARY')
  console.log('='.repeat(84))
  for (const o of outcomes) {
    console.log(`  ${o.pass ? 'PASS' : 'FAIL'}  ${o.label}`)
    console.log(`        ${o.detail}`)
  }

  const allPass = outcomes.every(o => o.pass)
  console.log('')

  if (allPass) {
    console.log('ALL PASS. The map discriminates, holds still, and separates two')
    console.log('fixtures with known and opposite coverage of the same domain.')
  } else {
    console.log('FAIL. Do not point this at a real archive. Read which gate failed:')
    console.log('  GATE 1 low spread   -> the map says the same thing about every domain.')
    console.log('                         Either the probes are not reaching the fingerprint,')
    console.log('                         or the fixture is too thin to distinguish domains.')
    console.log('  GATE 1 all backed   -> the verifier is rubber-stamping. Stop and investigate.')
    console.log('  GATE 2 failed       -> every domain read open. Same diagnosis as low spread.')
    console.log('  GATE 3 failed       -> Margaret has no capital allocation deposits and the')
    console.log('                         map did not read Capital open. It is claiming coverage')
    console.log('                         that does not exist. Worst case.')
    console.log('  GATE 4 failed       -> the map does not hold still. Reduce noise before')
    console.log('                         touching thresholds. Do not tune a threshold to go green.')
    console.log('  GATE 5 failed       -> overreach never fires. The second dimension is dead weight.')
    console.log('  GATE 6 failed       -> the map cannot separate two archives with known and')
    console.log('                         opposite coverage of one domain. It is reading the probe')
    console.log('                         set rather than the archive, and every other gate here')
    console.log('                         could pass while that was true.')
  }

  process.exit(allPass ? 0 : 1)
}

// EXIT CODES ARE LOAD BEARING.
//   0  every gate passed
//   1  a gate failed. The map is wrong.
//   2  the harness could not finish. The map is unjudged, NOT wrong.
//
// This distinction exists because it was missing once and cost a false
// conclusion. A run died on `getaddrinfo ENOTFOUND api.anthropic.com` partway
// through the fourth pass, and the wrapper printed "the map failed to
// discriminate on a fixture whose ground truth is known." It had established no
// such thing. That is the same defect this suite keeps catching in itself: a
// check reporting a conclusion it did not reach.
main().catch(e => {
  console.error('')
  console.error('='.repeat(84))
  console.error('HARNESS FAILURE. This is NOT a gate result.')
  console.error('='.repeat(84))
  console.error(e instanceof Error ? `${e.name}: ${e.message}` : e)
  console.error('')
  console.error('The run did not finish, so the map was not judged. It is not wrong, it is')
  console.error('unmeasured. Re-run. If this keeps happening on the same probe, that probe')
  console.error('is the problem rather than the network.')
  process.exit(2)
})
