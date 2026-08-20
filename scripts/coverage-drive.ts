/**
 * Local acceptance driver for the coverage map.
 *
 * Runs a REAL coverage run against a real archive and prints the acceptance
 * output, without deploying anything and without waiting on an Inngest sync.
 * Same pattern as the other live drivers in this folder.
 *
 * It calls lib/coverageRun.ts, the same implementation the deployed Inngest
 * function calls. The only difference is the unit-of-work wrapper: Inngest
 * passes step.run, this passes a pass-through so you can watch it and kill it.
 * Nothing about the probes, the prompt, the verifier, the rollup, or the writes
 * differs, which is the point. If this run is green, the deployed run is the
 * same run.
 *
 * IT WRITES REAL ROWS. coverage_runs, coverage_probe_results, and
 * archive_coverage all get written for the archive you name. It touches nothing
 * else: no deposits, no training pairs, no archive fields. Against a b2c archive
 * the run is flagged off_label automatically, because the b2b probe set does not
 * match that segment and a diagnostic result must not be mistaken for a
 * customer-facing one.
 *
 * COST. Two model calls per probe. At probe set v2 that is 96 calls and roughly
 * six minutes.
 *
 * Run:
 *   npx tsx scripts/coverage-drive.ts <archiveId>
 *   npx tsx scripts/coverage-drive.ts a38e4503-c7d2-4af3-af8c-cacd66974e0b
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { supabaseAdmin } from '../lib/supabase-admin'
import { runCoverage } from '../lib/coverageRun'
import { PROBE_SET_VERSION, COVERAGE_PROBES } from '../lib/coverageProbes'
import { coverageStateLabel, overreachLabel, OVERREACH_EXPLAINER, rollUpRun, type ProbeResult } from '../lib/coverage'

// Static imports are safe here only because both clients are lazy: the Supabase
// admin client is a Proxy that constructs on first property access, and the
// Anthropic clients in coverageRun.ts and verifyGrounding.ts construct on first
// call. Neither reads the environment at import time, so dotenv running below
// the import block is still in time. If either is ever made eager, this script
// breaks on import and the fix is to make it lazy again, not to reorder this.
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']) {
  if (!process.env[key]) {
    console.error(`ERROR: missing required environment variable ${key} (set it in .env.local)`)
    process.exit(1)
  }
}

const archiveId = process.argv[2]

if (!archiveId) {
  console.error('usage: npx tsx scripts/coverage-drive.ts <archiveId>')
  process.exit(1)
}

function rule(): void { console.log('='.repeat(84)) }

async function main() {
  rule()
  console.log('COVERAGE DRIVE')
  console.log(`archive     ${archiveId}`)
  console.log(`probe set   ${PROBE_SET_VERSION} (${COVERAGE_PROBES.length} probes, ${COVERAGE_PROBES.length * 2} model calls)`)
  rule()

  const started = Date.now()
  let done = 0

  const result = await runCoverage({
    archiveId,
    triggerSource: 'manual',
    onProbe: (r) => {
      done += 1
      // + deposit, ! reached past, . declined, x verifier failed and was discarded.
      // The x case became renderable in slice 2.2, when onProbe widened to the
      // whole ProbeResult. Before that a discarded verdict printed as ! here, which
      // showed a parse failure as the entity reaching past the archive.
      process.stdout.write(
        r.verifierErrored ? 'x' : r.basis === 'deposit' ? '+' : r.basis === 'unsupported' ? '!' : '.',
      )
      if (done % COVERAGE_PROBES.length === 0) process.stdout.write('\n')
    },
  })

  const elapsed = Math.round((Date.now() - started) / 1000)
  console.log('')

  if ('skipped' in result) {
    console.log(`SKIPPED: ${result.skipped}`)
    console.log('')
    console.log('If this says a run is already in flight, an earlier drive died before')
    console.log('closing its row. Close it by hand, then re-run:')
    console.log(`  update coverage_runs set finished_at = now(), ok = false,`)
    console.log(`    error = 'abandoned' where archive_id = '${archiveId}' and finished_at is null;`)
    process.exit(1)
  }

  // ── 1. The map ───────────────────────────────────────────────────────────────
  rule()
  console.log('THE MAP')
  rule()
  for (const r of result.rollups) {
    const bar  = r.state === 'backed' ? '###' : r.state === 'partial' ? '## ' : '   '
    const flag = r.damped ? '  (damped)' : ''
    console.log(
      `  ${bar}  ${r.domain.padEnd(16)} ${r.state.padEnd(8)} ${r.probesDeposit}/${r.probesTotal} deposit` +
      `  reach=${r.overreach.padEnd(4)} (${r.probesOverreach} over, ${r.probesDeclined} declined)${flag}`,
    )
    console.log(`         "${coverageStateLabel(r.state)}"` +
      (overreachLabel(r.state, r.overreach) ? `  "${overreachLabel(r.state, r.overreach)}"` : ''))
  }
  console.log('')
  console.log(`  ${OVERREACH_EXPLAINER}`)

  // ── 2. The run row ───────────────────────────────────────────────────────────
  const { data: runRow } = await supabaseAdmin
    .from('coverage_runs').select('*').eq('id', result.runId).single()

  console.log('')
  rule()
  console.log('coverage_runs ROW')
  rule()
  console.log(JSON.stringify(runRow, null, 2))

  if (runRow?.off_label) {
    console.log('')
    console.log('  OFF LABEL. The b2b probe set was run against a non-succession archive.')
    console.log('  This result is diagnostic. Do not show it to a customer and do not')
    console.log('  quote it as coverage for this archive.')
  }
  if (runRow && runRow.complete === false) {
    console.log('')
    console.log('  INCOMPLETE. At least one probe failed, so an open domain here is a')
    console.log('  weaker claim than an open domain from a full run. See coverage_runs.error.')
  }

  // ── 3. The stored map rows ───────────────────────────────────────────────────
  const { data: coverageRows } = await supabaseAdmin
    .from('archive_coverage').select('*').eq('archive_id', archiveId).order('domain')

  console.log('')
  rule()
  console.log(`archive_coverage ROWS (${coverageRows?.length ?? 0})`)
  rule()
  console.log(JSON.stringify(coverageRows, null, 2))

  // ── 4. Why an open domain is open ────────────────────────────────────────────
  // This is the part that decides whether the map is worth showing anyone. A
  // domain reading open is a claim about the archive. Read the replies and judge
  // whether the entity genuinely had nothing, or whether the probe was bad.
  // The most actionable domain, not the first one. Among the domains that are
  // not backed, the one where the entity reached past the archive most is where
  // a successor hits the most refusals, so it is where one deposit buys the
  // most. Ties break toward the emptier domain.
  const firstOpen = result.rollups
    .filter(r => r.state !== 'backed')
    .sort((a, b) => b.probesOverreach - a.probesOverreach || a.probesDeposit - b.probesDeposit)[0]

  if (firstOpen) {
    const { data: replies } = await supabaseAdmin
      .from('coverage_probe_results')
      .select('probe_key, basis, topic, reply')
      .eq('run_id', result.runId)
      .eq('domain', firstOpen.domain)
      .order('probe_key')

    console.log('')
    rule()
    console.log(`WHY ${firstOpen.domain.toUpperCase()} READ ${firstOpen.state.toUpperCase()}` +
      `  (reach=${firstOpen.overreach}, the most actionable domain on this map)`)
    rule()
    for (const row of replies ?? []) {
      const probe = COVERAGE_PROBES.find(p => p.key === row.probe_key)
      console.log('')
      console.log(`  [${row.probe_key}] basis=${row.basis} topic="${row.topic}"`)
      console.log(`  PROBE: ${probe?.question ?? '(unknown)'}`)
      console.log(`  REPLY: ${String(row.reply ?? '').replace(/\n/g, '\n         ')}`)
    }
    console.log('')
    console.log('  JUDGE THIS. If a reply above takes a clear position that a real deposit')
    console.log('  backs, the probe or the verifier is wrong, not the archive. If the entity')
    console.log('  visibly had nothing to stand on, the map is telling the truth.')
  }

  // ── 5. Delta against the previous run ────────────────────────────────────────
  // This is what makes the map an instrument rather than a readout. A prompt or
  // probe change is judged by running it twice and reading the difference, and
  // the two runs are only comparable at the same probe_set_version, which is why
  // the query filters on it rather than just taking the last run.
  const { data: prevRun } = await supabaseAdmin
    .from('coverage_runs')
    .select('id, started_at, probes_deposit, probes_overreach, probes_declined')
    .eq('archive_id', archiveId)
    .eq('probe_set_version', PROBE_SET_VERSION)
    .eq('ok', true)
    .neq('id', result.runId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (prevRun) {
    const { data: prevProbes } = await supabaseAdmin
      .from('coverage_probe_results')
      .select('probe_key, domain, basis, topic')
      .eq('run_id', prevRun.id)

    const prevResults: ProbeResult[] = (prevProbes ?? []).map(r => ({
      probeKey:        r.probe_key as string,
      domain:          r.domain as string,
      basis:           r.basis as ProbeResult['basis'],
      // Discarded verdicts are marked by topic at write time, so a historical
      // run rolls up under the same rules as a fresh one.
      verifierErrored: String(r.topic ?? '').startsWith('verifier failsafe'),
    }))
    const prevMap = rollUpRun(prevResults)

    const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)

    console.log('')
    rule()
    console.log(`DELTA vs RUN ${prevRun.id} (${String(prevRun.started_at).slice(0, 19)})`)
    rule()
    console.log(`  deposit    ${prevRun.probes_deposit} -> ${result.results.filter(r => !r.verifierErrored && r.basis === 'deposit').length}`)
    console.log(`  overreach  ${prevRun.probes_overreach} -> ${result.results.filter(r => !r.verifierErrored && r.basis === 'unsupported').length}`)
    console.log(`  declined   ${prevRun.probes_declined} -> ${result.results.filter(r => !r.verifierErrored && r.basis === 'no_position').length}`)
    console.log('')
    console.log('  per domain (deposit / overreach)')
    for (const now of result.rollups) {
      const was = prevMap.find(r => r.domain === now.domain)
      if (!was) continue
      const dDep = now.probesDeposit - was.probesDeposit
      const dOvr = now.probesOverreach - was.probesOverreach
      const moved = was.state !== now.state ? `  ${was.state} -> ${now.state}` : ''
      console.log(
        `    ${now.domain.padEnd(16)} ${was.probesDeposit}->${now.probesDeposit} (${sign(dDep)})` +
        `   ${was.probesOverreach}->${now.probesOverreach} (${sign(dOvr)})${moved}`,
      )
    }
    console.log('')
    console.log('  READ BOTH COLUMNS. Overreach falling on its own is not a win: an entity')
    console.log('  that declines everything scores perfectly and is worthless. The result')
    console.log('  worth having is overreach down with deposit flat or up.')
  }

  console.log('')
  rule()
  console.log(`DONE in ${elapsed}s. run ${result.runId}, ok=${result.ok}, complete=${result.complete}`)
  rule()
  process.exit(result.ok ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
