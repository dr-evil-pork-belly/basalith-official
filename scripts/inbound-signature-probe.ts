/**
 * Regression gate for inbound webhook signature verification.
 *
 * Drives the REAL /api/resend/inbound over HTTP, under the real Next runtime.
 * The unit tests in app/api/resend/inbound-signature.test.ts call the handler
 * function directly. This runs the same assertions through the server, which is
 * the only way to prove the raw-body read survives Next's request handling. A
 * verifier that works in vitest and reads an already-consumed body in
 * production would pass there and fail here.
 *
 * WRITES NOTHING. Every case uses a token of all zeroes, which no session ever
 * carries, so the accepted case lands on the uniform unknown-token response
 * instead of an insert. That is the whole discrimination this gate needs:
 *
 *   HTTP 401                        the signature gate refused
 *   HTTP 200 unknown-token body     the signature gate passed and the handler ran
 *
 * Safe to run against any environment, including production, because no branch
 * of it can reach a write.
 *
 * Requires the dev server on localhost:3000 (or PROBE_BASE_URL) and
 * RESEND_INBOUND_WEBHOOK_SECRET in .env.local.
 *
 * Run: npx tsx scripts/inbound-signature-probe.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { signResendPayload } from '../lib/resendSignatureTestUtils'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE   = process.env.PROBE_BASE_URL ?? 'http://localhost:3000'
const SECRET = process.env.RESEND_INBOUND_WEBHOOK_SECRET ?? ''

if (!SECRET) {
  console.error('ERROR: RESEND_INBOUND_WEBHOOK_SECRET is not set in .env.local')
  process.exit(1)
}

/** A token of all zeroes. No session carries it, so no case here can write. */
const DEAD_TOKEN = '0'.repeat(24)

const BODY = JSON.stringify({
  from: 'Signature Probe <sigprobe@example.com>',
  to:   `reply+${DEAD_TOKEN}@reply.basalith.ai`,
  text: 'SIGPROBE a reply that resolves to no session.',
})

let failures = 0
function check(name: string, pass: boolean, detail: string) {
  console.log(`  ${pass ? 'PASS' : '*** FAIL ***'}  ${name}`)
  console.log(`         ${detail}`)
  if (!pass) failures++
}

async function hit(body: string, headers: Record<string, string>) {
  const res = await fetch(`${BASE}/api/resend/inbound`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  })
  return { status: res.status, body: await res.text() }
}

const show = (r: { status: number; body: string }) => `HTTP ${r.status} ${JSON.stringify(r.body)}`

async function main() {
  console.log(`\ninbound-signature-probe  base=${BASE}\n`)

  const good = signResendPayload(BODY, SECRET)

  // ── Gate 1: a validly signed request reaches the handler ──────────────────
  console.log('Gate 1  a validly signed request is accepted')
  const accepted = await hit(BODY, good)
  check('signed request passes the gate and the handler runs', accepted.status === 200,
    show(accepted))

  // ── Gate 2: unsigned refused ──────────────────────────────────────────────
  console.log('\nGate 2  an unsigned request is refused')
  const unsigned = await hit(BODY, {})
  check('no svix headers is 401', unsigned.status === 401, show(unsigned))

  // ── Gate 3: tampered body refused ─────────────────────────────────────────
  console.log('\nGate 3  a body changed after signing is refused')
  const tampered = await hit(BODY.replace('no session', 'NO SESSION'), good)
  check('tampered body is 401', tampered.status === 401, show(tampered))

  // ── Gate 4: a swapped token refused, the token is inside the signed bytes ─
  console.log('\nGate 4  a swapped reply token is refused')
  const swapped = await hit(BODY.replace(DEAD_TOKEN, 'f'.repeat(24)), good)
  check('captured signature over a different token is 401', swapped.status === 401,
    show(swapped))

  // ── Gate 5: each header is load-bearing ───────────────────────────────────
  console.log('\nGate 5  each of the three svix headers is required')
  const dropped: Array<{ status: number; body: string }> = []
  for (const key of ['svix-id', 'svix-timestamp', 'svix-signature']) {
    const partial: Record<string, string> = { ...good }
    delete partial[key]
    const r = await hit(BODY, partial)
    dropped.push(r)
    check(`missing ${key} is 401`, r.status === 401, show(r))
  }

  // ── Gate 6: replay outside the tolerance ──────────────────────────────────
  console.log('\nGate 6  a captured request replayed later is refused')
  const stale = await hit(BODY, signResendPayload(BODY, SECRET, { at: new Date(Date.now() - 10 * 60 * 1000) }))
  check('timestamp ten minutes old is 401', stale.status === 401, show(stale))

  // ── Gate 7: a secret that is not ours ─────────────────────────────────────
  console.log('\nGate 7  a signature under some other secret is refused')
  const forged = await hit(BODY, signResendPayload(BODY, 'whsec_' + Buffer.from('an attacker guess').toString('base64')))
  check('wrong secret is 401', forged.status === 401, show(forged))

  // ── Gate 8: rejections say nothing about why ──────────────────────────────
  console.log('\nGate 8  every rejection is byte-identical')
  const rejections = [unsigned, tampered, swapped, ...dropped, stale, forged]
  const uniform = rejections.every(r => r.status === rejections[0].status && r.body === rejections[0].body)
  check('same status and same body across all seven rejections', uniform,
    `${rejections.length} rejections, all ${show(rejections[0])}`)

  console.log(`\n${failures === 0 ? 'ALL GATES PASSED' : `${failures} GATE(S) FAILED`}\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
