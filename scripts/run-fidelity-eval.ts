import './load-env'

/**
 * Fidelity eval runner (Tests A/B/C/D) for a single archive.
 *
 * Flags:
 *   --archive <id>     required
 *   --commit           default is dry run (zero model calls, zero DB writes)
 *   --topup-holdout    assigns new holdouts to maintain ~15% via
 *                       lib/holdoutAssignment.ts. Composes with --commit
 *                       the same way scripts/assign-holdout.ts does. Never
 *                       runs implicitly as part of an eval.
 *
 * Dry run (default):
 *   npx tsx scripts/run-fidelity-eval.ts --archive <archiveId>
 *
 * Commit (writes eval_runs/eval_results, calls the judge + generator models):
 *   npx tsx scripts/run-fidelity-eval.ts --archive <archiveId> --commit
 *
 * Top up holdout assignment for this archive (separate action, not an eval):
 *   npx tsx scripts/run-fidelity-eval.ts --archive <archiveId> --topup-holdout [--commit]
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import {
  buildEvalConfig,
  runTestA,
  runTestB,
  runTestC,
  runTestD,
  formatTestAReport,
  formatTestBReport,
  defaultDeps,
  type EvalRunConfig,
  type VoiceDepositDetail,
  type ContentTrialDetail,
} from '../lib/fidelityEval'
import {
  computeArchiveHoldoutPlan,
  commitHoldoutAssignments,
  formatDistribution,
  MIN_SCALE,
} from '../lib/holdoutAssignment'

const COMMIT = process.argv.includes('--commit')
const TOPUP  = process.argv.includes('--topup-holdout')

const archiveFlagIndex = process.argv.indexOf('--archive')
const ARCHIVE_ID = archiveFlagIndex !== -1 ? process.argv[archiveFlagIndex + 1] : null

if (!ARCHIVE_ID) {
  console.error('\nERROR: --archive <archiveId> is required.\n')
  process.exit(1)
}

// ── --topup-holdout: separate explicit action, reuses lib/holdoutAssignment ──

async function runTopup(archiveId: string): Promise<void> {
  console.log(`── TOPUP HOLDOUT (${COMMIT ? 'COMMIT' : 'DRY RUN'}) — archive ${archiveId} ──\n`)

  const plan = await computeArchiveHoldoutPlan(archiveId)
  console.log(`Classified owner deposits: ${plan.classifiedCount}`)

  if (plan.insufficientData) {
    console.log(`Insufficient data (need ${MIN_SCALE}, have ${plan.classifiedCount}). No holdout assigned.`)
    return
  }

  console.log(`Target (~15%):              ${plan.target}`)
  console.log(`Existing holdouts:          ${plan.existingHoldouts}`)
  console.log(`New holdouts to assign:     ${plan.newHoldoutIds.length}\n`)
  console.log('Per-domain holdout distribution:')
  formatDistribution(plan).forEach(line => console.log(line))

  if (plan.newHoldoutIds.length === 0) {
    console.log('\nNothing to do.')
    return
  }

  if (!COMMIT) {
    console.log(`\nThis was a dry run. ${plan.newHoldoutIds.length} deposit(s) would be marked eval_holdout = true.`)
    console.log('Re-run with --topup-holdout --commit to apply.')
    return
  }

  await commitHoldoutAssignments(plan.newHoldoutIds)
  console.log(`\nCommitted: ${plan.newHoldoutIds.length} deposit(s) marked eval_holdout = true.`)
}

// ── Cost guard ───────────────────────────────────────────────────────────────

interface CostEstimate {
  generationsA:    number
  voiceJudges:     number
  questionGenB:    [number, number]
  generationsB:    [number, number]
  contentJudgesB:  [number, number]
  totalLow:        number
  totalHigh:       number
}

function estimateCost(holdoutCount: number, qualifyingA: number): CostEstimate {
  const generationsA   = qualifyingA
  const voiceJudges    = qualifyingA * 3
  const questionGenB: [number, number]   = [holdoutCount, holdoutCount]
  // Each holdout yields 1-2 factual questions; each question is one
  // generation + one content judge call.
  const generationsB: [number, number]   = [holdoutCount, holdoutCount * 2]
  const contentJudgesB: [number, number] = [holdoutCount, holdoutCount * 2]

  const totalLow  = generationsA + voiceJudges + questionGenB[0] + generationsB[0] + contentJudgesB[0]
  const totalHigh = generationsA + voiceJudges + questionGenB[1] + generationsB[1] + contentJudgesB[1]

  return { generationsA, voiceJudges, questionGenB, generationsB, contentJudgesB, totalLow, totalHigh }
}

function printCostEstimate(cost: CostEstimate): void {
  console.log('Estimated model API calls:')
  console.log(`  Entity generations (Test A):    ${cost.generationsA}`)
  console.log(`  Voice judge calls (Test A):      ${cost.voiceJudges}`)
  console.log(`  Question-generation calls (B):   ${cost.questionGenB[0]}`)
  console.log(`  Entity generations (Test B):     ${cost.generationsB[0]}-${cost.generationsB[1]}`)
  console.log(`  Content judge calls (Test B):    ${cost.contentJudgesB[0]}-${cost.contentJudgesB[1]}`)
  console.log(`  Total:                            ${cost.totalLow}-${cost.totalHigh} calls`)
}

// ── Report formatting for Tests C and D ─────────────────────────────────────

function formatTestCBlock(status: string): string {
  if (status === 'no_succession_archives_active') {
    return 'Test C (reasoning): stub only. This archive is not succession-tier, so Test C reports "no succession archives active" and was not executed.'
  }
  return `Test C (reasoning): ${status}`
}

function formatTestDBlock(counts: { thisIsMe: number; notQuiteRight: number; heart: number; total: number; month: string }): string {
  if (counts.total === 0) {
    return `Test D (live signal, ${counts.month}): no mirror_reflections owner reactions recorded this month.`
  }
  return (
    `Test D (live signal, ${counts.month}): ${counts.total} reaction(s) — ` +
    `this_is_me=${counts.thisIsMe}, not_quite_right=${counts.notQuiteRight}, heart=${counts.heart}`
  )
}

// ── Config comparison for non-comparability warning ─────────────────────────

async function findPreviousEvalRun(archiveId: string, currentEvalRunId: string): Promise<{ id: string; config: EvalRunConfig } | null> {
  const { data } = await supabaseAdmin
    .from('eval_runs')
    .select('id, config, created_at')
    .eq('archive_id', archiveId)
    .neq('id', currentEvalRunId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return null
  return { id: data[0].id, config: data[0].config as EvalRunConfig }
}

function diffConfigs(current: EvalRunConfig, previous: EvalRunConfig): string[] {
  const diffs: string[] = []

  if (current.judgeModel !== previous.judgeModel) {
    diffs.push(`judgeModel: ${previous.judgeModel} -> ${current.judgeModel}`)
  }
  if (current.judgeVersionTag !== previous.judgeVersionTag) {
    diffs.push(`judgeVersionTag: ${previous.judgeVersionTag} -> ${current.judgeVersionTag}`)
  }
  if (current.generatorModel !== previous.generatorModel) {
    diffs.push(`generatorModel: ${previous.generatorModel} -> ${current.generatorModel}`)
  }
  if (current.generatorPathVersion !== previous.generatorPathVersion) {
    diffs.push(`generatorPathVersion: ${previous.generatorPathVersion} -> ${current.generatorPathVersion}`)
  }
  for (const key of Object.keys(current.promptTemplateHashes)) {
    const prevHash = previous.promptTemplateHashes?.[key]
    const curHash  = current.promptTemplateHashes[key]
    if (prevHash !== curHash) {
      diffs.push(`promptTemplateHashes.${key}: ${prevHash ?? '(none)'} -> ${curHash}`)
    }
  }

  return diffs
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const archiveId = ARCHIVE_ID as string

  if (TOPUP) {
    await runTopup(archiveId)
    return
  }

  console.log(`── FIDELITY EVAL (${COMMIT ? 'COMMIT' : 'DRY RUN'}) — archive ${archiveId} ──\n`)

  // ── Minimum-scale gate (lives here, runs before anything else) ────────────
  const plan = await computeArchiveHoldoutPlan(archiveId)

  if (plan.insufficientData) {
    console.log(`Classified owner deposits: ${plan.classifiedCount}`)
    console.log(`Minimum scale for eval:    ${MIN_SCALE}`)
    console.log(`\nResult: insufficient data. Tests A and B were skipped — this archive does not yet`)
    console.log(`have enough classified deposits for a meaningful holdout-based eval.`)
    return
  }

  const holdouts    = await defaultDeps.getHoldoutDeposits(archiveId)
  const holdoutCount = holdouts.length
  const qualifyingA  = holdouts.filter(d => d.prompt).length

  console.log(`Classified owner deposits: ${plan.classifiedCount}`)
  console.log(`Holdout deposits:          ${holdoutCount}`)
  console.log(`Test A qualifying (holdouts with stored prompt): ${qualifyingA}/${holdoutCount}\n`)

  console.log('Planned trials:')
  console.log(`  Test A: ${qualifyingA} deposit(s) x 3 repetitions = ${qualifyingA * 3} voice judge trials`)
  console.log(`  Test B: ${holdoutCount} deposit(s) x 1-2 questions = ${holdoutCount}-${holdoutCount * 2} content trials`)
  console.log(`  Test C: stub only (reasoning) -- no model calls`)
  console.log(`  Test D: read-only query over mirror_reflections -- no model calls\n`)

  const cost = estimateCost(holdoutCount, qualifyingA)
  printCostEstimate(cost)

  if (!COMMIT) {
    console.log('\nThis was a dry run. Zero model calls, zero database writes.')
    console.log('Re-run with --commit to execute.')
    return
  }

  console.log('')

  const config = buildEvalConfig(holdoutCount)
  const evalRunId = await defaultDeps.createEvalRun(archiveId, config, null)

  try {
    const resultA = await runTestA(archiveId, evalRunId, config)
    const resultB = await runTestB(archiveId, evalRunId, config)

    const contaminatedA = resultA.details.flatMap((d: VoiceDepositDetail) => d.contaminatedDepositIds)
    const contaminatedB = resultB.details.flatMap((d: ContentTrialDetail) => d.contaminatedDepositIds)
    const contaminated  = [...new Set([...contaminatedA, ...contaminatedB])]

    if (contaminated.length > 0) {
      await supabaseAdmin
        .from('eval_runs')
        .update({ config: { ...config, status: 'aborted_contamination', aborted_contamination: true, contaminated_deposit_ids: contaminated } })
        .eq('id', evalRunId)

      console.error('ABORTED: holdout contamination detected.')
      console.error(`The following holdout deposit id(s) leaked into entity retrieval despite excludeDepositIds:`)
      contaminated.forEach(id => console.error(`  - ${id}`))
      console.error(`\neval_run ${evalRunId} has been marked aborted_contamination = true.`)
      console.error('This run is not a valid baseline. Investigate excludeDepositIds before re-running.')
      process.exitCode = 1
      return
    }

    let resultC
    try {
      resultC = await runTestC(archiveId, evalRunId)
    } catch (err) {
      resultC = { status: err instanceof Error ? err.message : 'reasoning eval error', results: [] }
    }

    const month = new Date().toISOString().slice(0, 7)
    const resultD = await runTestD(archiveId, month, evalRunId)

    // ── Report ─────────────────────────────────────────────────────────────

    console.log('═══ FIDELITY EVAL REPORT ═══\n')
    console.log(`Archive: ${archiveId}`)
    console.log(`Holdout deposits: ${holdoutCount} (15% stratified sample, see scripts/assign-holdout.ts)\n`)

    if (resultA.metrics) console.log(formatTestAReport(resultA.metrics) + '\n')
    if (resultB.metrics) console.log(formatTestBReport(resultB.metrics) + '\n')
    console.log(formatTestCBlock(resultC.status) + '\n')
    console.log(formatTestDBlock({ ...resultD, month }) + '\n')

    console.log('── Run info ──')
    console.log(`eval_run id: ${evalRunId}`)
    console.log('Config:')
    console.log(`  judge model:           ${config.judgeModel} (${config.judgeVersionTag})`)
    console.log(`  generator model:       ${config.generatorModel}`)
    console.log(`  generator path:        ${config.generatorPathVersion}`)
    console.log(`  prompt template hashes:`)
    for (const [key, hash] of Object.entries(config.promptTemplateHashes)) {
      console.log(`    ${key}: ${hash}`)
    }

    const previous = await findPreviousEvalRun(archiveId, evalRunId)
    if (!previous) {
      console.log('\nComparison: first run for this archive, no comparison.')
    } else {
      const diffs = diffConfigs(config, previous.config)
      if (diffs.length === 0) {
        console.log(`\nComparison: config matches previous run ${previous.id}. Results are directly comparable.`)
      } else {
        console.log(`\nWARNING: config differs from previous run ${previous.id} -- results are NOT directly comparable:`)
        diffs.forEach(d => console.log(`  - ${d}`))
      }
    }
  } catch (err) {
    await supabaseAdmin
      .from('eval_runs')
      .update({
        config: {
          ...config,
          status: 'aborted_error',
          error: err instanceof Error ? err.message : String(err),
        },
      })
      .eq('id', evalRunId)
    throw err
  }
}

main().catch(err => {
  console.error('Fidelity eval error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
