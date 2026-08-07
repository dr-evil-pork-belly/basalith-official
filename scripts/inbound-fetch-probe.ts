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

  if (!TOKEN) {
    console.log('\nGate B  skipped, no token argument given (it spends a live token)')
    console.log(`\n${failures === 0 ? 'GATE A PASSED' : `${failures} CHECK(S) FAILED`}\n`)
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
