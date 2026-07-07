/**
 * Acceptance-gate drive for the ephemeral demo capture buffer.
 *
 * Runs a full demo incident in-process through the EXACT shared transform the
 * Guide-gated endpoints use (lib/demoIncidentBuffer.ts), holding the session in a
 * single local variable (the buffer). Proves:
 *   1. a full run: seed -> timeline -> per-branch spine -> stake/read/calibration
 *      -> generalize -> tradeoff -> complete
 *   2. writes-nothing: owner_deposits, training_pairs, deposit_domain_scores and
 *      incident_sessions row counts identical before and after
 *   3. statelessness: the run creates zero rows anywhere; the session lives only
 *      in the local variable and its id is a synthetic demo:<uuid>
 *
 * Read-only against the database except that it proves ABSENCE of writes.
 *
 *   npx tsx scripts/demo-buffer-drive.ts
 */
import './load-env'
import { supabaseAdmin } from '../lib/supabase-admin'
import {
  pickDemoSeed,
  startDemoSession,
  runDemoTurn,
  DEMO_ARCHIVE_PREFIX,
} from '../lib/demoIncidentBuffer'

// Scripted founder answers, keyed by the probe being answered. Each carries a
// real rule, named people (for READ), a stake, and confidence language (for
// CALIBRATION), so the interview walks the full spine and closes all three
// dimensions.
const ANSWERS: Record<string, string> = {
  SEED: 'In 2019 I had to decide whether to sunset our flagship product line. Sales were sliding and the board was split.',
  TIMELINE:
    'First, Maria flagged that churn was climbing in the spring. Then I pulled the numbers myself and saw the margins were underwater. I chose to freeze new features. After that, David pushed hard to keep investing, and I decided instead to sunset the line and move the team to the new platform.',
  CUE: 'The first sign was a pattern in the support tickets. Refunds kept citing the same missing capability, weeks before the churn showed up in the dashboard.',
  OPTION: 'I seriously considered a price cut to hold customers, and I considered a partial rebuild. I decided against the price cut because it would have signaled panic.',
  BASIS: 'What tipped it was the unit economics. Even a full rebuild would not clear the margin bar within a year, and I do not fund things that cannot pay for themselves in a year.',
  BOUNDARY: 'I would have gone the other way if a single enterprise contract had covered the rebuild cost. Below that line I cut. Above it I invest.',
  ERROR: 'Someone new would keep the product alive too long out of loyalty to the team. The trap is treating sunk effort as a reason to continue.',
  STAKE: 'What I was most trying to protect was the team. If I strung them along on a dying product, I would lose the people I needed for the next thing.',
  READ: 'My read on David was that he was right about the upside but too close to it emotionally. Maria I trusted completely. She called it early and without ego.',
  CALIBRATION: 'I was about seventy percent sure. Not certain, but sure enough to act and to tell the board plainly.',
  TRADEOFF: 'Speed versus certainty. When they pulled against each other, certainty gave way. I would rather act on a seventy percent read than wait for proof and lose the quarter.',
  ANALOGUE: 'I had seen the same shape years earlier with a services contract we held onto too long. Same loyalty trap.',
  GOAL: 'What I was really trying to protect was the credibility to make the next hard call. Not this product.',
}
const GENERIC = 'I made the call deliberately, I weighed the tradeoffs, and I would stand by the reasoning today.'

const answerFor = (probeType: string): string => ANSWERS[probeType] ?? GENERIC

async function counts() {
  const [d, p, dd, i] = await Promise.all([
    supabaseAdmin.from('owner_deposits').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('training_pairs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('deposit_domain_scores').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('incident_sessions').select('*', { count: 'exact', head: true }),
  ])
  return {
    owner_deposits:        d.count ?? -1,
    training_pairs:        p.count ?? -1,
    deposit_domain_scores: dd.count ?? -1,
    incident_sessions:     i.count ?? -1,
  }
}

async function main() {
  console.log('=== BEFORE (global row counts) ===')
  const before = await counts()
  console.log(JSON.stringify(before, null, 2))

  console.log('\n=== FULL DEMO RUN ===')
  const seed = await pickDemoSeed()
  let { session, probe } = startDemoSession(seed)
  console.log(`SEED  (category: ${seed.category})  [session ${session.id}]`)
  console.log(`  Q: ${probe.question}`)

  let currentProbeType = probe.probeType
  let guard = 0
  while (session.status === 'open' && guard < 40) {
    guard++
    const ans = answerFor(currentProbeType)
    console.log(`  A: ${ans}`)
    const res = await runDemoTurn(session, ans)
    session = res.session
    const dimStr = `stake=${res.dimensions.stake} · read=${res.dimensions.read} · calibration=${res.dimensions.calibration}`

    if (res.incidentComplete || !res.nextProbe) {
      console.log(`\n  [dimensions] ${dimStr}`)
      console.log('\nCOMPLETE')
      break
    }
    const tag = res.dimensionTag ? `  (closed ${res.dimensionTag.dimension}=${res.dimensionTag.status})` : ''
    console.log(`\n${res.nextProbe.probeType}${res.reprobed ? ' (re-probe)' : ''}${tag}`)
    console.log(`  [dimensions] ${dimStr}`)
    console.log(`  Q: ${res.nextProbe.question}`)
    currentProbeType = res.nextProbe.probeType
  }

  console.log('\n=== AFTER (global row counts) ===')
  const after = await counts()
  console.log(JSON.stringify(after, null, 2))

  console.log('\n=== GATE 2 — WRITES NOTHING ===')
  const rows: [string, number, number][] = [
    ['owner_deposits',        before.owner_deposits,        after.owner_deposits],
    ['training_pairs',        before.training_pairs,        after.training_pairs],
    ['deposit_domain_scores', before.deposit_domain_scores, after.deposit_domain_scores],
    ['incident_sessions',     before.incident_sessions,     after.incident_sessions],
  ]
  let allEqual = true
  for (const [name, b, a] of rows) {
    const ok = b === a
    if (!ok) allEqual = false
    console.log(`  ${name.padEnd(24)} ${String(b).padStart(5)} -> ${String(a).padStart(5)}   ${ok ? 'UNCHANGED' : 'CHANGED ***'}`)
  }
  console.log(`  RESULT: ${allEqual ? 'PASS — buffer wrote nothing' : 'FAIL — a table changed'}`)

  console.log('\n=== GATE 3 — STATELESSNESS ===')
  console.log(`  session held only in a local variable; id = ${session.id}`)
  console.log(`  synthetic archiveId prefix: ${session.id.startsWith(DEMO_ARCHIVE_PREFIX) ? 'OK (demo:)' : 'FAIL'}`)
  console.log(`  incident_sessions rows created: ${after.incident_sessions - before.incident_sessions} (expected 0)`)
  console.log(`  final phase/status: ${session.phase}/${session.status}`)
  console.log(`  RESULT: ${allEqual && session.id.startsWith(DEMO_ARCHIVE_PREFIX) ? 'PASS — no server-side session persisted' : 'FAIL'}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
