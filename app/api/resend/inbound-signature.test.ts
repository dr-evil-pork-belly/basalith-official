/**
 * Webhook signature verification at the inbound boundary.
 *
 * /api/resend/inbound is a public POST that writes into family archives. Before
 * this slice the only thing standing between an anonymous caller and a write was
 * the reply token in the To address. A token bounds who can write and for how
 * long. It does not say the request came from Resend. Anyone holding a live
 * token could POST straight at the route.
 *
 * What is asserted here, against the REAL handler and the REAL verifier:
 *   1. a validly signed request is accepted and writes a deposit
 *   2. an unsigned request is rejected and writes nothing
 *   3. a tampered body is rejected and writes nothing
 *   4. a stale timestamp is rejected, so a captured request cannot be replayed
 *   5. an absent secret rejects rather than skipping verification (fails closed)
 *   6. every rejection is byte-identical, so nothing leaks about which failed
 *
 * 3 is the one that matters most. The token in the To address is inside the
 * signed bytes, so swapping it invalidates the signature. That is what makes the
 * signature an authorization check and not just a provenance stamp.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { signResendPayload } from '@/lib/resendSignatureTestUtils'

const H = vi.hoisted(() => {
  const ARCHIVE_ID = 'archive-under-test'
  type Call = { table: string; op: string }
  const calls: Call[] = []
  let sessionRow: Record<string, unknown> | null = null

  function setSession(row: Record<string, unknown> | null) { sessionRow = row }
  function reset() { calls.length = 0; sessionRow = null }

  function makeBuilder(table: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    const b: Record<string, unknown> = {}

    b.select = () => b
    b.insert = () => { op = 'insert'; return b }
    b.update = () => { op = 'update'; return b }
    b.delete = () => { op = 'delete'; return b }
    for (const m of ['eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'gte', 'lte', 'gt', 'lt', 'match', 'like', 'filter']) {
      b[m] = () => b
    }

    const terminal = () => {
      calls.push({ table, op })
      if (table === 'email_reply_sessions' && op === 'select') return { data: sessionRow, error: null }
      if (table === 'owner_deposits' && op === 'insert') {
        return {
          data:  { id: 'deposit-1', archive_id: ARCHIVE_ID, prompt: 'q', response: 'a', source_type: 'email_reply' },
          error: null,
        }
      }
      return { data: null, error: null }
    }

    b.single      = async () => terminal()
    b.maybeSingle = async () => terminal()
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      calls.push({ table, op })
      return Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
    }
    return b
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { ARCHIVE_ID, calls, setSession, reset, supabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('@/lib/resend', () => ({ resend: { emails: { send: async () => ({}) } } }))
vi.mock('@/lib/trainingPipeline', () => ({ createTrainingPairFromDeposit: vi.fn(async () => {}) }))
vi.mock('@/lib/classifyDeposit', () => ({ classifyDeposit: vi.fn(async () => {}) }))
vi.mock('@/lib/memoryChain', () => ({ triggerMemoryChain: vi.fn(async () => {}) }))

import { POST } from '@/app/api/resend/inbound/route'

const TOKEN  = 'aabbccddeeff001122334455'
const SECRET = process.env.RESEND_INBOUND_WEBHOOK_SECRET!
const DAY    = 24 * 60 * 60 * 1000

function session(over: Record<string, unknown> = {}) {
  return {
    id: 'session-1', token: TOKEN, archive_id: H.ARCHIVE_ID, contributor_id: null,
    email_type: 'owner_daily', spark_id: 'a question', prompt_id: null, photograph_id: null,
    replied: false, question_history_id: null,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
    archives: { id: H.ARCHIVE_ID, name: 'The Test Archive', owner_name: 'Owner Name', owner_email: 'owner@example.com', preferred_language: 'en' },
    contributors: null,
    ...over,
  }
}

function payload(token = TOKEN) {
  return JSON.stringify({
    from: 'Owner Name <owner@example.com>',
    to:   `reply+${token}@reply.basalith.ai`,
    text: 'This is my memory of that day.',
  })
}

/** A request carrying whatever headers the caller hands it, signed or not. */
function post(body: string, headers: Record<string, string>) {
  return new NextRequest('https://basalith.ai/api/resend/inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  })
}

/** Signed correctly over exactly these bytes. */
function signed(body: string, at?: Date) {
  return post(body, signResendPayload(body, SECRET, { at }))
}

beforeEach(() => { H.reset() })

describe('inbound webhook signature', () => {
  it('accepts a validly signed request and writes the deposit', async () => {
    H.setSession(session())
    const res  = await POST(signed(payload()))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, saved: 'owner_daily' })
    expect(H.calls.some(c => c.table === 'owner_deposits' && c.op === 'insert')).toBe(true)
  })

  it('rejects an unsigned request and never touches the database', async () => {
    H.setSession(session())
    const res = await POST(post(payload(), {}))

    expect(res.status).toBe(401)
    expect(H.calls).toHaveLength(0)
  })

  it('rejects a request missing any one of the three svix headers', async () => {
    H.setSession(session())
    const body = payload()
    const full = signResendPayload(body, SECRET)

    for (const drop of ['svix-id', 'svix-timestamp', 'svix-signature'] as const) {
      H.reset()
      H.setSession(session())
      const partial = { ...full }
      delete partial[drop]

      const res = await POST(post(body, partial))
      expect(res.status, `missing ${drop}`).toBe(401)
      expect(H.calls, `missing ${drop}`).toHaveLength(0)
    }
  })

  it('rejects a body tampered with after signing', async () => {
    H.setSession(session())
    const original = payload()
    const headers  = signResendPayload(original, SECRET)

    // One character of the reply text changed. Everything else identical.
    const tampered = original.replace('my memory', 'MY MEMORY')
    expect(tampered).not.toBe(original)

    const res = await POST(post(tampered, headers))
    expect(res.status).toBe(401)
    expect(H.calls).toHaveLength(0)
  })

  it('rejects a swapped reply token, because the token is inside the signed bytes', async () => {
    H.setSession(session())
    const headers = signResendPayload(payload(TOKEN), SECRET)

    // A captured signature replayed against a different archive's token.
    const res = await POST(post(payload('ffffffffffffffffffffffff'), headers))
    expect(res.status).toBe(401)
    expect(H.calls).toHaveLength(0)
  })

  it('rejects a signature signed with the wrong secret', async () => {
    H.setSession(session())
    const body = payload()
    const res  = await POST(post(body, signResendPayload(body, 'whsec_' + Buffer.from('a different secret entirely').toString('base64'))))

    expect(res.status).toBe(401)
    expect(H.calls).toHaveLength(0)
  })

  it('rejects a replayed request whose timestamp has gone stale', async () => {
    H.setSession(session())
    const body = payload()
    // svix hard-codes a five minute tolerance. Ten minutes back is outside it.
    const res = await POST(signed(body, new Date(Date.now() - 10 * 60 * 1000)))

    expect(res.status).toBe(401)
    expect(H.calls).toHaveLength(0)
  })
})

describe('fail closed when the secret is absent', () => {
  const REAL = process.env.RESEND_INBOUND_WEBHOOK_SECRET

  afterEach(() => { process.env.RESEND_INBOUND_WEBHOOK_SECRET = REAL })

  it('rejects rather than skipping verification when the env var is unset', async () => {
    H.setSession(session())
    const body    = payload()
    const headers = signResendPayload(body, SECRET) // a genuinely valid signature

    delete process.env.RESEND_INBOUND_WEBHOOK_SECRET
    const res = await POST(post(body, headers))

    // Even a correct signature is refused. There is no configuration in which
    // this route accepts an unverified write.
    expect(res.status).toBe(401)
    expect(H.calls).toHaveLength(0)
  })

  it('rejects when the env var is set to something that is not a usable secret', async () => {
    H.setSession(session())
    const body    = payload()
    const headers = signResendPayload(body, SECRET)

    process.env.RESEND_INBOUND_WEBHOOK_SECRET = ''
    const emptyRes = await POST(post(body, headers))
    expect(emptyRes.status).toBe(401)

    process.env.RESEND_INBOUND_WEBHOOK_SECRET = 'not base64 !!!'
    const junkRes = await POST(post(body, headers))
    expect(junkRes.status).toBe(401)

    expect(H.calls).toHaveLength(0)
  })
})

describe('rejections leak nothing about why', () => {
  it('returns a byte-identical response for unsigned, tampered, stale, and unconfigured', async () => {
    const REAL = process.env.RESEND_INBOUND_WEBHOOK_SECRET
    const body = payload()
    const good = signResendPayload(body, SECRET)

    const shapes: Array<[string, () => Promise<Response>]> = [
      ['unsigned',     () => POST(post(body, {}))],
      ['tampered',     () => POST(post(body.replace('memory', 'MEMORY'), good))],
      ['stale',        () => POST(signed(body, new Date(Date.now() - 10 * 60 * 1000)))],
      ['wrong secret', () => POST(post(body, signResendPayload(body, 'whsec_' + Buffer.from('other').toString('base64'))))],
      ['unconfigured', async () => {
        delete process.env.RESEND_INBOUND_WEBHOOK_SECRET
        const r = await POST(post(body, good))
        process.env.RESEND_INBOUND_WEBHOOK_SECRET = REAL
        return r
      }],
    ]

    const seen: Array<{ name: string; status: number; body: string; headers: string }> = []
    for (const [name, run] of shapes) {
      H.reset()
      H.setSession(session())
      const res = await run()
      seen.push({
        name,
        status:  res.status,
        body:    await res.text(),
        headers: JSON.stringify([...res.headers.entries()].sort()),
      })
    }

    const first = seen[0]
    for (const s of seen.slice(1)) {
      expect(s.status,  `${s.name} status`).toBe(first.status)
      expect(s.body,    `${s.name} body`).toBe(first.body)
      expect(s.headers, `${s.name} headers`).toBe(first.headers)
    }
    expect(first.status).toBe(401)
  })
})
