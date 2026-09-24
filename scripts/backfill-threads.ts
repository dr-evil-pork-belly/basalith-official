import './load-env'

/**
 * Record threads: backfill one Basalith, then print what was found so a person
 * can read every thread against the owner's own words.
 *
 * Slice 1 of tailored questions (docs/TAILORED_QUESTIONS_2026-09-24.md). Not
 * imported by app code. Run by hand.
 *
 * Dry run (default, calls nothing, lists what would be extracted):
 *   npx tsx scripts/backfill-threads.ts --archive <archiveId>
 *
 * Extract (one Haiku call per pending owner deposit):
 *   npx tsx scripts/backfill-threads.ts --archive <archiveId> --commit
 *
 * Report only (reads record_threads, calls no model):
 *   npx tsx scripts/backfill-threads.ts --archive <archiveId> --report
 *
 * --archive is required. There is no all-archives mode on purpose: the hourly
 * sweep covers active Basaliths once THREAD_EXTRACTION=on, and a backfill is for
 * reading one Basalith closely.
 *
 * Same exclusions as the sweep: owner deposits only, no eval holdout, no test
 * artifact, no empty response. Unlike the sweep this does not require status =
 * 'active', so a named test Basalith can be read before it is live.
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import { extractThreadsForDeposit, EXTRACTOR_VERSION } from '../lib/threadExtract'

const COMMIT = process.argv.includes('--commit')
const REPORT = process.argv.includes('--report')
const i = process.argv.indexOf('--archive')
const ARCHIVE_ID = i !== -1 ? process.argv[i + 1] : null

if (!ARCHIVE_ID) {
  console.error('\nERROR: --archive <archiveId> is required.\n')
  process.exit(1)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function report(archiveId: string) {
  const { data, error } = await supabaseAdmin
    .from('record_threads')
    .select('kind, label, domain_hint, weight, sensitive, quote, deposit_ids, status, first_said_at, last_said_at, extractor_version')
    .eq('archive_id', archiveId)
    .order('kind', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(`record_threads read: ${error.message}`)

  const rows = data ?? []
  console.log(`\n── ${rows.length} threads ─────────────────────────────────────────\n`)
  let kind = ''
  for (const r of rows) {
    if (r.kind !== kind) { kind = r.kind; console.log(`\n${kind.toUpperCase()}`) }
    const mentions = (r.deposit_ids as string[]).length
    const day = (v: unknown) => (typeof v === 'string' ? v.slice(0, 10) : '?')
    const said = r.first_said_at === r.last_said_at ? day(r.first_said_at) : `${day(r.first_said_at)} to ${day(r.last_said_at)}`
    const flags = [
      r.domain_hint ?? 'no area',
      `weight ${r.weight}`,
      `${mentions} mention${mentions === 1 ? '' : 's'}`,
      said,
      r.sensitive ? 'SENSITIVE' : null,
      r.status !== 'open' ? r.status : null,
    ].filter(Boolean).join(' · ')
    console.log(`  ${r.label}  [${flags}]`)
    console.log(`    "${r.quote}"`)
  }

  const { data: ledger } = await supabaseAdmin
    .from('record_thread_extractions')
    .select('threads_found, error, attempts')
    .eq('archive_id', archiveId)
  const l = ledger ?? []
  const failed = l.filter(x => x.error)
  console.log(`\nLedger: ${l.length} deposits read, ${failed.length} with an error${failed.length ? ` (max attempts ${Math.max(...failed.map(f => f.attempts))})` : ''}.\n`)
}

async function main() {
  const archiveId = ARCHIVE_ID!
  if (REPORT) return report(archiveId)

  console.log(`── ${COMMIT ? 'COMMIT' : 'DRY RUN'} · archive ${archiveId} · extractor ${EXTRACTOR_VERSION} ──\n`)

  const { data: archive, error: aErr } = await supabaseAdmin
    .from('archives').select('id, name, tier, status').eq('id', archiveId).maybeSingle()
  if (aErr || !archive) throw new Error(`archive ${archiveId}: ${aErr?.message ?? 'not found'}`)
  console.log(`${archive.name} · tier ${archive.tier} · status ${archive.status}\n`)

  const { data: deposits, error: dErr } = await supabaseAdmin
    .from('owner_deposits')
    .select('id, prompt, response, contributor_id, eval_holdout, test_artifact, created_at')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: true })
  if (dErr) throw new Error(`owner_deposits read: ${dErr.message}`)

  const { data: done } = await supabaseAdmin
    .from('record_thread_extractions')
    .select('deposit_id, error, attempts')
    .eq('archive_id', archiveId)
  const settled = new Set((done ?? []).filter(d => !d.error || d.attempts >= 3).map(d => d.deposit_id as string))

  const all      = deposits ?? []
  const eligible = all.filter(d =>
    !d.contributor_id && d.eval_holdout !== true && d.test_artifact !== true && (d.response ?? '').trim().length > 0)
  const pending  = eligible.filter(d => !settled.has(d.id))

  console.log(`Owner deposits eligible: ${eligible.length} of ${all.length}`)
  console.log(`Already read:            ${eligible.length - pending.length}`)
  console.log(`Pending:                 ${pending.length}\n`)

  let created  = 0
  let attached = 0
  let errors   = 0
  for (const d of pending) {
    if (!COMMIT) { console.log(`would read ${d.id} (${(d.response ?? '').length} chars)`); continue }
    const out = await extractThreadsForDeposit({
      depositId: d.id, archiveId, tier: archive.tier, prompt: d.prompt, response: d.response ?? '',
      saidAt: d.created_at,
    })
    created  += out.created
    attached += out.attached
    if (out.error) errors += 1
    const drops = out.dropped.length ? `, dropped ${out.dropped.map(x => x.reason).join('/')}` : ''
    console.log(`${d.id}: ${out.error ? `ERROR ${out.error}` : `${out.created} new, ${out.attached} attached${drops}`}`)
    await sleep(300)
  }

  if (COMMIT) {
    console.log(`\nNew threads: ${created}. Mentions attached: ${attached}. Errors: ${errors}.`)
    await report(archiveId)
  } else {
    console.log('\nDry run. Re-run with --commit to extract.\n')
  }
}

main().catch(err => {
  console.error('backfill-threads error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
