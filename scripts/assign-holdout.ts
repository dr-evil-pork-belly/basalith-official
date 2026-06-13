import './load-env'

/**
 * Stratified eval-holdout assignment for owner_deposits.eval_holdout.
 *
 * Plan logic lives in lib/holdoutAssignment.ts (shared with
 * scripts/run-fidelity-eval.ts --topup-holdout).
 *
 * Dry run (default, assigns nothing):
 *   npx tsx scripts/assign-holdout.ts
 *
 * Commit (writes eval_holdout = true for selected deposits):
 *   npx tsx scripts/assign-holdout.ts --commit
 *
 * Limit to a single archive (combinable with --commit):
 *   npx tsx scripts/assign-holdout.ts --archive <archiveId> [--commit]
 *
 * Required env vars (read from .env.local if present):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import {
  computeArchiveHoldoutPlan,
  commitHoldoutAssignments,
  formatDistribution,
  fetchAllRows,
  MIN_SCALE,
} from '../lib/holdoutAssignment'

const COMMIT = process.argv.includes('--commit')

const archiveFlagIndex = process.argv.indexOf('--archive')
const ARCHIVE_ID = archiveFlagIndex !== -1 ? process.argv[archiveFlagIndex + 1] : null

if (archiveFlagIndex !== -1 && !ARCHIVE_ID) {
  console.error('\nERROR: --archive requires an archive id argument.\n')
  process.exit(1)
}

async function main() {
  console.log(`── ${COMMIT ? 'COMMIT' : 'DRY RUN'}${ARCHIVE_ID ? ` — archive ${ARCHIVE_ID}` : ''} ──────────────────────────────────────────────\n`)

  let archiveIds: string[]
  if (ARCHIVE_ID) {
    archiveIds = [ARCHIVE_ID]
  } else {
    const rows = await fetchAllRows<{ archive_id: string }>('owner_deposits', 'archive_id')
    archiveIds = [...new Set(rows.map(r => r.archive_id))]
  }

  const allToAssign: string[] = []

  for (const archiveId of archiveIds) {
    const plan = await computeArchiveHoldoutPlan(archiveId)

    console.log(`Archive ${archiveId}`)
    console.log(`  Classified owner deposits: ${plan.classifiedCount}`)

    if (plan.insufficientData) {
      console.log(`  Result: insufficient data, no holdout assigned (need ${MIN_SCALE}, have ${plan.classifiedCount})\n`)
      continue
    }

    console.log(`  Target (~15%):              ${plan.target}`)
    console.log(`  Existing holdouts:          ${plan.existingHoldouts}`)

    if (plan.newHoldoutIds.length === 0 && plan.existingHoldouts >= plan.target) {
      console.log(`  Result: no-op (existing holdouts already meet target)\n`)
      formatDistribution(plan).forEach(line => console.log(line))
      console.log('')
      continue
    }

    console.log(`  Deficit:                    ${plan.deficit}`)
    console.log(`  Mandatory (domain floors):  ${plan.mandatoryFloors}`)
    console.log(`  New holdouts to assign:     ${plan.newHoldoutIds.length}`)
    console.log(`  Result: ${plan.newHoldoutIds.length === 0 ? 'no-op (no eligible deposits to assign)' : (COMMIT ? 'assigned' : 'would assign')}\n`)

    console.log('  Per-domain holdout distribution:')
    formatDistribution(plan).forEach(line => console.log(line))
    console.log('')

    allToAssign.push(...plan.newHoldoutIds)
  }

  if (allToAssign.length === 0) {
    console.log('Nothing to do.')
    return
  }

  if (!COMMIT) {
    console.log(`This was a dry run. ${allToAssign.length} deposit(s) would be marked eval_holdout = true.`)
    console.log('Re-run with --commit to apply.\n')
    return
  }

  await commitHoldoutAssignments(allToAssign)
  console.log(`Committed: ${allToAssign.length} deposit(s) marked eval_holdout = true.\n`)
}

main().catch(err => {
  console.error('Holdout assignment error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
