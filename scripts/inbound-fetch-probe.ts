/**
 * Regression gate for the Receiving API fetch path.
 *
 * The other two inbound gates both inline `text` in the webhook body, so
 * neither ever runs the fetch. A real Resend delivery carries no body at all,
 * only an email_id, which means the untested path is the only path production
 * uses. This closes that.
 *
 * Gate A costs nothing and is safe to run any time: a bogus email_id produces a
 * genuine 404 from Resend, and the handler must answer 500 rather than the 200
 * that used to tell Resend the reply was delivered.
 *
 * Gate B SPENDS A REAL REPLY TOKEN. It posts the true webhook shape (an id and
 * no body) against a live token, so the handler fetches the body from Resend
 * for real and writes a real deposit. The token is single-use and will be dead
 * afterwards. It is therefore opt-in: pass the token explicitly.
 *
 *   npx tsx scripts/inbound-fetch-probe.ts                      # Gate A only
 *   npx tsx scripts/inbound-fetch-probe.ts <live-token>         # A and B
 *
 * Requires the dev server on localhost:3000 (or PROBE_BASE_URL), plus
 * RESEND_API_KEY and RESEND_INBOUND_WEBHOOK_SECRET in .env.local.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { signResendPayload } from '../lib/resendSignatureTestUtils'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE    = process.env.PROBE_BASE_URL ?? 'http://localhost:3000'
const SECRET  = process.env.RESEND_INBOUND_WEBHOOK_SECRET ?? ''
const API_KEY = process.env.RESEND_API_KEY ?? ''
const DOMAIN  = process.env.RESEND_REPLY_DOMAIN ?? 'reply.basalith.ai'
const TOKEN   = process.argv[2] ?? null

if (!SECRET || !API_KEY) {
  console.error('ERROR: RESEND_INBOUND_WEBHOOK_SECRET and RESEND_API_KEY must both be set')
  process.exit(1)
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

let failures = 0
function check(name: string, pass: boolean, detail: string) {
  console.log(`  ${pass ? 'PASS' : '*** FAIL ***'}  ${name}`)
  console.log(`         ${detail}`)
  if (!pass) failures++
}

/** The real webhook shape: an id, no body. Forces the handler to fetch. */
async function postWebhook(emailId: string, to: string) {
  const raw = JSON.stringify({
    type:       'email.received',
    created_at: new Date().toISOString(),
    data: {
      email_id:   emailId,
      created_at: new Date().toISOString(),
      from:       'Fetch Probe <fetchprobe@example.com>',
      to:         [to],
      bcc:        [],
      cc:         [],
      message_id: '<fetch-probe@example.com>',
      subject:    '',
      attachments: [],
    },
  })
  const res = await fetch(`${BASE}/api/resend/inbound`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...signResendPayload(raw, SECRET) },
    body:    raw,
  })
  return { status: res.status, body: await res.text() }
}

/**
 * An OUTBOUND email event, in the shape resend@6.9.4 declares for it: `type` at
 * the top level, `email_id` under `data`. `inline` decides whether the payload
 * carries its own text, which is what separates the two things Gate C proves.
 */
async function postOutboundEvent(type: string, emailId: string, to: string, inline?: string) {
  const raw = JSON.stringify({
    type,
    created_at: new Date().toISOString(),
    data: {
      email_id:   emailId,
      created_at: new Date().toISOString(),
      from:       'The Hoa Le Tran Archive <archive@basalith.xyz>',
      to:         [to],
      subject:    'A question from the archive',
      ...(inline ? { text: inline } : {}),
    },
  })
  const res = await fetch(`${BASE}/api/resend/inbound`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...signResendPayload(raw, SECRET) },
    body:    raw,
  })
  return { status: res.status, body: await res.text() }
}

const show = (r: { status: number; body: string }) => `HTTP ${r.status} ${JSON.stringify(r.body)}`

async function main() {
  console.log(`\ninbound-fetch-probe  base=${BASE}\n`)

  // ── Gate A: a real Receiving API failure must not report success ──────────
  console.log('Gate A  a Receiving API 404 returns 500, not 200')

  const bogus = '00000000-0000-4000-8000-000000000000'
  const direct = await fetch(`https://api.resend.com/emails/receiving/${bogus}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  console.log(`         (Resend's own answer for that id: HTTP ${direct.status})`)

  const a = await postWebhook(bogus, `reply+${'0'.repeat(24)}@${DOMAIN}`)
  check('handler answers 500 so Resend retries instead of dropping the reply',
    a.status === 500, show(a))
  check('and it is not the old silent 200', a.status !== 200, show(a))

  // ── Gate C: an event we do not handle never reaches the fetch ─────────────
  //
  // This endpoint is subscribed to every event Resend emits, verified live:
  // GET /webhooks reports 18 types on it, including email.sent and
  // email.delivered. Outbound events carry an email_id under `data` in exactly
  // the place an inbound event carries its own, so without the type gate the
  // handler asked the RECEIVING store for an OUTBOUND id and got a legitimate
  // 404. Once a failed fetch became a 500, every delivery notification became a
  // permanent retry loop. On 2026-08-07 one send-photos run produced 13 outbound
  // emails and 101 failing requests across four retry rounds.
  //
  // The id below is one of those 13. It is a real outbound id, so it genuinely
  // 404s on the receiving store, which is what makes this a reproduction rather
  // than a mock: without the gate this case is a 500.
  console.log('\nGate C  an outbound event is skipped with 200, before the fetch')

  const OUTBOUND_ID = '58e5b958-7f6b-42e6-ad60-a7af29254e30'
  const c1 = await postOutboundEvent('email.delivered', OUTBOUND_ID, `reply+${'0'.repeat(24)}@${DOMAIN}`)
  check('email.delivered is skipped, not fetched (a 500 here means the gate is gone)',
    c1.status === 200 && c1.body.includes('event type not handled'), show(c1))

  const c1b = await postOutboundEvent('email.sent', OUTBOUND_ID, `reply+${'0'.repeat(24)}@${DOMAIN}`)
  check('email.sent likewise', c1b.status === 200 && c1b.body.includes('event type not handled'), show(c1b))

  const c1c = await postOutboundEvent('contact.created', OUTBOUND_ID, `reply+${'0'.repeat(24)}@${DOMAIN}`)
  check('so is a non-email event the endpoint is also subscribed to',
    c1c.status === 200 && c1c.body.includes('event type not handled'), show(c1c))

  if (!TOKEN) {
    console.log('\nGates C2 and B  skipped, no token argument given (they use a live token)')
    console.log(`\n${failures === 0 ? 'GATES A AND C PASSED' : `${failures} CHECK(S) FAILED`}\n`)
    process.exit(failures === 0 ? 0 : 1)
  }

  // ── Gate B: the real fetch path, end to end ───────────────────────────────
  console.log('\nGate B  a real reply through the real fetch path')

  const { data: session, error: sErr } = await db.from('email_reply_sessions')
    .select('archive_id, replied, expires_at').eq('token', TOKEN).maybeSingle()
  if (sErr || !session) {
    check('token resolves to a session', false, sErr?.message ?? 'token not found')
    process.exit(1)
  }
  if (session.replied || new Date(session.expires_at) < new Date()) {
    check('token is live and unreplied', false,
      `replied=${session.replied} expires=${session.expires_at}`)
    process.exit(1)
  }

  // ── Gate C2: the gate returns before any database contact ─────────────────
  //
  // C1 proves the fetch is not attempted. This proves nothing is read or written
  // either, and it uses the genuinely live token about to be spent by Gate B.
  // The payload inlines its own text, so there is no fetch to fail behind: if
  // the gate were absent this would resolve the token, write a deposit, burn the
  // token, and email a confirmation. The token still being unreplied afterwards
  // is the assertion.
  console.log('\nGate C2  an outbound event does not touch a live token')

  const depositCount = async () => (await db.from('owner_deposits')
    .select('id', { count: 'exact', head: true }).eq('archive_id', session.archive_id)).count ?? 0

  const beforeC2 = await depositCount()
  const c2 = await postOutboundEvent(
    'email.delivered', OUTBOUND_ID, `reply+${TOKEN}@${DOMAIN}`,
    'THIS MUST NEVER BECOME A DEPOSIT',
  )
  const { data: afterC2 } = await db.from('email_reply_sessions')
    .select('replied').eq('token', TOKEN).maybeSingle()
  const afterC2Count = await depositCount()

  check('skipped with 200 and the live token is untouched',
    c2.status === 200 && c2.body.includes('event type not handled') && afterC2?.replied === false,
    `${show(c2)} | replied=${afterC2?.replied}`)
  check('and nothing was written to the archive',
    afterC2Count === beforeC2, `deposits ${beforeC2} -> ${afterC2Count}`)

  // A genuine inbound Resend still holds, so the fetch returns real content.
  const lr = await fetch('https://api.resend.com/emails/receiving', {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  const rows = (await lr.json()).data ?? []
  if (!rows.length) {
    check('a real inbound email exists to fetch', false, 'Resend lists none')
    process.exit(1)
  }
  const realId = rows[0].id
  console.log(`         using real inbound email_id=${realId}`)

  const archiveId = session.archive_id
  const before = (await db.from('owner_deposits')
    .select('id', { count: 'exact', head: true }).eq('archive_id', archiveId)).count ?? 0

  const b = await postWebhook(realId, `reply+${TOKEN}@${DOMAIN}`)

  const after = (await db.from('owner_deposits')
    .select('id', { count: 'exact', head: true }).eq('archive_id', archiveId)).count ?? 0
  const { data: post } = await db.from('email_reply_sessions')
    .select('replied, replied_at').eq('token', TOKEN).maybeSingle()
  const { data: row } = await db.from('owner_deposits')
    .select('id, prompt, response, source_type, created_at')
    .eq('archive_id', archiveId).order('created_at', { ascending: false }).limit(1).maybeSingle()

  check('the body was fetched from Resend and written as a deposit',
    b.status === 200 && after === before + 1,
    `${show(b)} | deposits ${before} -> ${after}`)
  check('the token was marked replied only after the deposit landed',
    post?.replied === true, `replied=${post?.replied} at ${post?.replied_at}`)
  check('the deposit carries the fetched text, not an error shape',
    !!row && row.response.length > 0 && !row.response.includes('statusCode'),
    `id=${row?.id} source_type=${row?.source_type}\n         response=${JSON.stringify(row?.response?.slice(0, 80))}`)

  console.log(`\n         deposit row id ${row?.id}  (delete it if you do not want the test content kept)`)
  console.log(`\n${failures === 0 ? 'ALL GATES PASSED' : `${failures} CHECK(S) FAILED`}\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
