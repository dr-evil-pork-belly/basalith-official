/**
 * One-time backfill that runs classifyDeposit() against every owner_deposits
 * row that does not yet have a deposit_domain_scores entry.
 *
 * This script is NOT imported by app code and does not run automatically.
 * It is meant to be run by hand, once, from the command line.
 *
 * Dry run (default, classifies nothing):
 *   npx tsx scripts/backfill-classify.ts
 *
 * Commit (calls classifyDeposit for each unclassified deposit):
 *   npx tsx scripts/backfill-classify.ts --commit
 *
 * Limit to a single archive (combinable with --commit):
 *   npx tsx scripts/backfill-classify.ts --archive <archiveId> [--commit]
 *
 * Contributor-sourced deposits (owner_deposits.contributor_id IS NOT NULL)
 * are always skipped — they must not feed the owner's coverage map.
 *
 * Required env vars (read from .env.local if present):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const COMMIT = process.argv.includes('--commit')

const archiveFlagIndex = process.argv.indexOf('--archive')
const ARCHIVE_ID = archiveFlagIndex !== -1 ? process.argv[archiveFlagIndex + 1] : null

if (archiveFlagIndex !== -1 && !ARCHIVE_ID) {
  console.error('\nERROR: --archive requires an archive id argument.\n')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\nERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  console.error('Set them in .env.local or in your shell environment.\n')
  process.exit(1)
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\nERROR: ANTHROPIC_API_KEY must be set.\n')
  process.exit(1)
}

// Imported after env vars are loaded, since these modules read env at module scope.
import { supabaseAdmin } from '../lib/supabase-admin'
import { classifyDeposit } from '../lib/classifyDeposit'

interface DepositRow {
  id:             string
  archive_id:     string
  prompt:         string | null
  response:       string | null
  contributor_id: string | null
}

async function fetchAllRows<T>(
  table: string,
  columns: string,
  applyFilter?: (query: any) => any,
): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const rows: T[] = []

  for (;;) {
    let query = supabaseAdmin.from(table).select(columns)
    if (applyFilter) query = applyFilter(query)
    const { data, error } = await query.range(from, from + pageSize - 1)

    if (error) {
      console.error(`ERROR fetching from ${table}: ${error.message}`)
      process.exit(1)
    }
    if (!data || data.length === 0) break

    rows.push(...(data as unknown as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  console.log(`── ${COMMIT ? 'COMMIT' : 'DRY RUN'}${ARCHIVE_ID ? ` — archive ${ARCHIVE_ID}` : ''} ──────────────────────────────────────────────\n`)

  const deposits = await fetchAllRows<DepositRow>(
    'owner_deposits',
    'id, archive_id, prompt, response, contributor_id',
    query => ARCHIVE_ID ? query.eq('archive_id', ARCHIVE_ID) : query,
  )
  const scored = await fetchAllRows<{ deposit_id: string }>('deposit_domain_scores', 'deposit_id')

  const scoredIds = new Set(scored.map(s => s.deposit_id))
  const ownerDeposits = deposits.filter(d => !d.contributor_id)
  const unclassified  = ownerDeposits.filter(d => !scoredIds.has(d.id))

  console.log(`Total owner_deposits:        ${deposits.length}`)
  console.log(`Contributor-sourced (skipped): ${deposits.length - ownerDeposits.length}`)
  console.log(`Already classified:          ${ownerDeposits.length - unclassified.length}`)
  console.log(`Unclassified:                ${unclassified.length}\n`)

  let skippedEmpty = 0
  let processed    = 0

  for (const dep of unclassified) {
    const text = dep.response?.trim()
    if (!text) {
      skippedEmpty += 1
      continue
    }

    if (!COMMIT) {
      console.log(`would classify ${dep.id} (archive ${dep.archive_id}, ${text.length} chars)`)
      processed += 1
      continue
    }

    console.log(`classifying ${dep.id} (archive ${dep.archive_id}, ${text.length} chars)`)
    await classifyDeposit({ depositId: dep.id, archiveId: dep.archive_id, text })
    processed += 1

    // Light rate limiting to avoid hammering the Anthropic API.
    await sleep(500)
  }

  console.log('\n── Summary ──────────────────────────────────────────────────────\n')
  console.log(`Mode:                    ${COMMIT ? 'commit' : 'dry run'}`)
  console.log(`Processed:               ${processed}`)
  console.log(`Skipped (empty text):    ${skippedEmpty}`)
  console.log('')

  if (!COMMIT) {
    console.log('This was a dry run. No deposits were classified.')
    console.log('Re-run with --commit to apply.\n')
  }
}

main().catch(err => {
  console.error('Backfill error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
