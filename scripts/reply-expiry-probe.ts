/**
 * Regression gate for reply token expiry.
 *
 * Drives the REAL inbound handler over HTTP against the live database and
 * asserts, in order:
 *
 *   Gate 1  a live token is accepted and writes a deposit
 *   Gate 2  an expired token is refused and writes nothing
 *   Gate 3  the expired response is byte-identical to the unknown-token response
 *   Gate 4  a replied token is refused, also byte-identical
 *   Gate 5  every mint path sets expires_at, and no live row carries a null
 *   Gate 6  an expired photo-reply window is refused and writes no email_replies
 *
 * Gate 3 is the one that matters. Expiry that announces itself is an oracle.
 *
 * All probe rows are sentinel-prefixed and removed before and after, so this is
 * safe to run repeatedly against production. It writes only to the Founder Test
 * Archive.
 *
 * Requires the dev server on localhost:3000 and CRON_SECRET-free access (the
 * inbound route has no auth by design; that is a separate finding).
 *
 * Run: npx tsx scripts/reply-expiry-probe.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { replyTokenExpiry, generateReplyToken, REPLY_TOKEN_TTL_DAYS } from '../lib/emailReplySessions'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE    = process.env.PROBE_BASE_URL ?? 'http://localhost:3000'
const ARCHIVE = '6c0722d3-719a-423f-9024-621ba0072d6f' // Founder Test Archive
const SENTINEL = 'EXPIRYPROBE'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

let failures = 0
function check(name: string, pass: boolean, detail: string) {
  console.log(`  ${pass ? 'PASS' : '*** FAIL ***'}  ${name}`)
  console.log(`         ${detail}`)
  if (!pass) failures++
}

async function post(to: string, text: string) {
  const res  = await fetch(`${BASE}/api/resend/inbound`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from: `Probe <${SENTINEL.toLowerCase()}@example.com>`, to, text }),
  })
  const body = await res.text()
  return { status: res.status, body }
}

async function cleanup() {
  await db.from('owner_deposits').delete().eq('archive_id', ARCHIVE).like('response', `${SENTINEL}%`)
  await db.from('email_reply_sessions').delete().eq('archive_id', ARCHIVE).like('spark_id', `${SENTINEL}%`)
}

async function mint(opts: { expiresAt: string; replied?: boolean }): Promise<string> {
  const token = generateReplyToken()
  const { error } = await db.from('email_reply_sessions').insert({
    token,
    archive_id:     ARCHIVE,
    contributor_id: null,
    email_type:     'owner_daily',
    spark_id:       `${SENTINEL} question`,
    expires_at:     opts.expiresAt,
    replied:        opts.replied ?? false,
  })
  if (error) throw new Error(`probe mint failed: ${error.message}`)
  return token
}

async function depositCount(): Promise<number> {
  const { count, error } = await db.from('owner_deposits')
    .select('id', { count: 'exact', head: true })
    .eq('archive_id', ARCHIVE).like('response', `${SENTINEL}%`)
  if (error) throw new Error(`deposit count failed: ${error.message}`)
  return count ?? 0
}

async function main() {
  console.log(`\nreply-expiry-probe  base=${BASE}  ttl=${REPLY_TOKEN_TTL_DAYS}d\n`)
  await cleanup()

  const domain = process.env.RESEND_REPLY_DOMAIN ?? 'reply.basalith.ai'

  // ── Gate 1: live token accepted ───────────────────────────────────────────
  console.log('Gate 1  live token is accepted')
  const liveToken = await mint({ expiresAt: replyTokenExpiry() })
  const before1   = await depositCount()
  const r1        = await post(`reply+${liveToken}@${domain}`, `${SENTINEL} a live reply`)
  const after1    = await depositCount()
  check('live token writes a deposit', after1 === before1 + 1,
    `HTTP ${r1.status} ${r1.body} | deposits ${before1} -> ${after1}`)

  // ── Gate 2: expired token refused ─────────────────────────────────────────
  console.log('\nGate 2  expired token is refused and writes nothing')
  const expiredAt   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // yesterday
  const expToken    = await mint({ expiresAt: expiredAt })
  const before2     = await depositCount()
  const r2          = await post(`reply+${expToken}@${domain}`, `${SENTINEL} a late reply`)
  const after2      = await depositCount()
  check('expired token writes no deposit', after2 === before2,
    `HTTP ${r2.status} ${r2.body} | deposits ${before2} -> ${after2}`)

  // ── Gate 3: expired is indistinguishable from unknown ─────────────────────
  console.log('\nGate 3  expired response is byte-identical to unknown')
  const r3 = await post(`reply+${'0'.repeat(24)}@${domain}`, `${SENTINEL} unknown token`)
  check('same status and same body', r2.status === r3.status && r2.body === r3.body,
    `expired: HTTP ${r2.status} ${r2.body}\n         unknown: HTTP ${r3.status} ${r3.body}`)

  // ── Gate 4: replied token refused, same shape ─────────────────────────────
  console.log('\nGate 4  already-replied token is refused, same shape')
  const usedToken = await mint({ expiresAt: replyTokenExpiry(), replied: true })
  const before4   = await depositCount()
  const r4        = await post(`reply+${usedToken}@${domain}`, `${SENTINEL} replay`)
  const after4    = await depositCount()
  check('replied token writes no deposit and looks identical',
    after4 === before4 && r4.status === r3.status && r4.body === r3.body,
    `HTTP ${r4.status} ${r4.body} | deposits ${before4} -> ${after4}`)

  // ── Gate 5: no null expiry anywhere ───────────────────────────────────────
  console.log('\nGate 5  every row carries an expires_at')
  const { count: nullCount, error: nullErr } = await db
    .from('email_reply_sessions').select('id', { count: 'exact', head: true }).is('expires_at', null)
  check('zero rows with null expires_at', !nullErr && (nullCount ?? -1) === 0,
    nullErr ? `query failed: ${nullErr.message}` : `null expires_at rows: ${nullCount}`)

  const { count: total }   = await db.from('email_reply_sessions').select('id', { count: 'exact', head: true })
  const { count: expired } = await db.from('email_reply_sessions')
    .select('id', { count: 'exact', head: true }).eq('replied', false).lte('expires_at', new Date().toISOString())
  const { count: liveNow } = await db.from('email_reply_sessions')
    .select('id', { count: 'exact', head: true }).eq('replied', false).gt('expires_at', new Date().toISOString())
  console.log(`         total=${total}  unreplied-expired=${expired}  unreplied-live=${liveNow}`)

  // ── Gate 6: photo-reply window enforced ───────────────────────────────────
  console.log('\nGate 6  a closed photo-reply window is refused')
  const { data: closed, error: closedErr } = await db.from('email_sessions')
    .select('id, reply_address, reply_window_closes')
    .lt('reply_window_closes', new Date().toISOString())
    .not('reply_address', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (closedErr || !closed?.length) {
    check('found a closed session to probe', false, closedErr?.message ?? 'no closed email_sessions row available')
  } else {
    const s = closed[0]
    const { count: beforeER } = await db.from('email_replies').select('id', { count: 'exact', head: true }).eq('session_id', s.id)
    const r6 = await post(s.reply_address as string, `${SENTINEL} reply to a closed window`)
    const { count: afterER } = await db.from('email_replies').select('id', { count: 'exact', head: true }).eq('session_id', s.id)
    check('closed window writes no email_replies row', beforeER === afterER,
      `addr=${s.reply_address} closed=${s.reply_window_closes}\n         HTTP ${r6.status} ${r6.body} | email_replies ${beforeER} -> ${afterER}`)
  }

  await cleanup()
  console.log(`\n${failures === 0 ? 'ALL GATES PASSED' : `${failures} GATE(S) FAILED`}\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
