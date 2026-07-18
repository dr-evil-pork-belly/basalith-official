/**
 * Regression gate for the grounding gap log (Slice A).
 *
 * Proves the real verifyGrounding -> logGroundingGap path writes the gap queue
 * correctly against the Founder Test Archive. Two layers:
 *
 *   A. WRITE LOGIC (deterministic, no model call): logGroundingGap dedupes on
 *      (archive_id, question_hash), increments hit_count on repeat, bumps
 *      last_seen_at, freezes the FIRST basis, and keeps the FIRST verbatim
 *      question. Case/whitespace/terminal-punctuation variants collapse to one
 *      row.
 *   B. VERIFIER PATH (live model): an uncovered question with a declining draft
 *      classifies non-'deposit' and lands a row; a covered question with a
 *      grounded draft classifies 'deposit' and writes NOTHING (mirrors the
 *      route's `basis !== 'deposit'` gate).
 *
 * Generation accuracy is gated elsewhere (two-layer-probe, demo-refusal-probe);
 * this gate is the WRITE PATH. All probe rows are sentinel-prefixed and cleaned
 * up before and after, so it is safe to run repeatedly against the live table.
 *
 * Requires log_grounding_gap() (20260718_grounding_gap_log_fn.sql) to be applied.
 *
 * Run: npx tsx scripts/gap-log-probe.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { verifyGrounding } from '../lib/verifyGrounding'
import { logGroundingGap } from '../lib/groundingGapLog'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const ARCHIVE_ID = '6c0722d3-719a-423f-9024-621ba0072d6f'
const SENTINEL   = 'GAPLOG_PROBE::' // every probe question starts with this

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type GapRow = {
  question:      string
  basis:         string
  hit_count:     number
  first_seen_at: string
  last_seen_at:  string
}

async function cleanup(): Promise<void> {
  await db.from('grounding_gaps').delete().eq('archive_id', ARCHIVE_ID).ilike('question', `${SENTINEL}%`)
}
async function probeRows(): Promise<GapRow[]> {
  const { data } = await db
    .from('grounding_gaps')
    .select('question, basis, hit_count, first_seen_at, last_seen_at')
    .eq('archive_id', ARCHIVE_ID)
    .ilike('question', `${SENTINEL}%`)
    .order('first_seen_at', { ascending: true })
  return (data ?? []) as GapRow[]
}
async function rowFor(question: string): Promise<GapRow | null> {
  const { data } = await db
    .from('grounding_gaps')
    .select('question, basis, hit_count, first_seen_at, last_seen_at')
    .eq('archive_id', ARCHIVE_ID)
    .eq('question', question)
    .maybeSingle()
  return (data as GapRow | null) ?? null
}
async function frozenPairs() {
  const { data, error } = await db
    .from('training_pairs')
    .select('prompt, completion')
    .eq('archive_id', ARCHIVE_ID)
    .eq('included_in_training', true)
    .order('quality_score', { ascending: false })
    .limit(20)
  if (error) { console.error('frozen pairs query failed:', error.message); process.exit(1) }
  return data ?? []
}

let failures = 0
function check(desc: string, cond: boolean, detail = ''): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${desc}${detail ? `  ${detail}` : ''}`)
  if (!cond) failures++
}

async function main() {
  await cleanup()

  // ── Layer A — deterministic write logic ────────────────────────────────────
  console.log('='.repeat(84))
  console.log('LAYER A — write logic (deterministic, no model)')
  console.log('='.repeat(84))

  const Q1  = `${SENTINEL} should we open a lunar office?`
  const Q1v = `${SENTINEL}   Should  We  Open A Lunar Office` // same after normalization

  await logGroundingGap({ archiveId: ARCHIVE_ID, question: Q1, basis: 'no_position' })
  let rows = await probeRows()
  const r1 = await rowFor(Q1)
  if (rows.length === 0) {
    // Fail fast and cheap: no write means the function is almost certainly not
    // applied. Skip Layer B so we do not burn live model calls on a dead gate.
    console.log('  FAIL  first sighting wrote no row.')
    console.log('  Is supabase/migrations/20260718_grounding_gap_log_fn.sql applied?')
    console.log('='.repeat(84))
    console.log('FAIL: gap log not writing. Do not ship.')
    process.exit(1)
  }
  check('first sighting inserts exactly one row', rows.length === 1, `rows=${rows.length}`)
  check("basis stored as 'no_position'", r1?.basis === 'no_position', `basis=${r1?.basis}`)
  check('question stored VERBATIM', r1?.question === Q1)
  check('hit_count = 1 on first sighting', r1?.hit_count === 1, `hit_count=${r1?.hit_count}`)
  const lastSeenAfterInsert = r1?.last_seen_at ?? ''

  await logGroundingGap({ archiveId: ARCHIVE_ID, question: Q1, basis: 'no_position' })
  rows = await probeRows()
  const r2 = await rowFor(Q1)
  check('exact repeat does not add a second row', rows.length === 1, `rows=${rows.length}`)
  check('hit_count = 2 after repeat', r2?.hit_count === 2, `hit_count=${r2?.hit_count}`)
  check('last_seen_at bumped', (r2?.last_seen_at ?? '') > lastSeenAfterInsert,
    `${lastSeenAfterInsert} -> ${r2?.last_seen_at}`)

  await logGroundingGap({ archiveId: ARCHIVE_ID, question: Q1v, basis: 'unsupported' })
  rows = await probeRows()
  const r3 = await rowFor(Q1)
  check('case/space/punct variant collapses to same row', rows.length === 1, `rows=${rows.length}`)
  check('hit_count = 3 after variant', r3?.hit_count === 3, `hit_count=${r3?.hit_count}`)
  check("first basis wins ('no_position' not churned to 'unsupported')",
    r3?.basis === 'no_position', `basis=${r3?.basis}`)
  check('first verbatim question retained (variant did not overwrite)', r3?.question === Q1)

  // ── Layer B — real verifyGrounding -> logGroundingGap wiring ────────────────
  console.log('')
  console.log('='.repeat(84))
  console.log('LAYER B — verifyGrounding -> logGroundingGap wiring (live model)')
  console.log('='.repeat(84))
  const pairs = await frozenPairs()

  // Uncovered question + declining draft -> non-'deposit' -> a row is written.
  const Qr = `${SENTINEL} Two cofounders built the company equally and one will be CEO. What equity split do you advise?`
  const draftR =
    'Honestly, I never settled on a single rule for cofounder splits. It depends on the ' +
    'people and what each keeps carrying. I am not going to hand you a number and pretend ' +
    'it was my decision.'
  const vr = await verifyGrounding({ pairs, question: Qr, answer: draftR })
  if (vr.basis !== 'deposit') {
    await logGroundingGap({ archiveId: ARCHIVE_ID, question: Qr, basis: vr.basis })
  }
  const rr = await rowFor(Qr)
  console.log(`  [refuse case] verdict.basis = ${vr.basis}`)
  check("uncovered decline classifies non-'deposit'", vr.basis !== 'deposit', `basis=${vr.basis}`)
  check('a gap row is written for the refuse case', rr !== null)
  check('logged basis matches the verdict', rr?.basis === vr.basis, `row=${rr?.basis} verdict=${vr.basis}`)
  check('refuse-case question stored VERBATIM', rr?.question === Qr)

  // Covered question + grounded draft -> 'deposit' -> nothing is written.
  const Qd = `${SENTINEL} A senior engineer candidate has weak technical skills but exceptional soft skills. Do we hire them for the senior engineering role?`
  const draftD =
    'No. For a senior engineering seat the technical bar comes first. Strong soft skills do ' +
    'not substitute for it, so I would not hire them for that role.'
  const vd = await verifyGrounding({ pairs, question: Qd, answer: draftD })
  if (vd.basis !== 'deposit') {
    await logGroundingGap({ archiveId: ARCHIVE_ID, question: Qd, basis: vd.basis })
  }
  const rd = await rowFor(Qd)
  console.log(`  [deposit case] verdict.basis = ${vd.basis}`)
  check("covered grounded draft classifies 'deposit'", vd.basis === 'deposit', `basis=${vd.basis}`)
  check("no row written when basis === 'deposit'", rd === null, rd ? `unexpected row basis=${rd.basis}` : '')

  await cleanup()

  console.log('')
  console.log('='.repeat(84))
  console.log(failures === 0 ? 'ALL PASS' : `FAIL: ${failures} check(s) failed. Do not ship.`)
  console.log('='.repeat(84))
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(e => { console.error('Probe error:', e instanceof Error ? e.message : e); process.exit(1) })
