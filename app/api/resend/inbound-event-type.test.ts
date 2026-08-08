/**
 * The endpoint is subscribed to every event Resend emits, not just
 * email.received.
 *
 * Verified against the live subscription, not the docs: GET /webhooks reports
 * 18 event types on https://basalith.ai/api/resend/inbound, including
 * email.sent, email.delivered, email.bounced, and the contact.* and domain.*
 * families.
 *
 * Outbound email events carry an email_id under `data`, in exactly the place an
 * inbound event carries its own (BaseEmailEventData in resend@6.9.4). So the
 * handler used to read an OUTBOUND id and ask the RECEIVING store for it, which
 * legitimately 404s. Once a failed fetch became a 500, every delivery
 * notification became a permanent Resend retry loop. On 2026-08-07 a single
 * send-photos run produced 13 outbound emails and 101 failing requests across
 * four retry rounds, with no family reply involved.
 *
 * What is asserted here is that a non-received event is turned away before the
 * fetch, that it is turned away with 200 rather than 500 so Resend stops
 * retrying, and that a real email.received is completely unaffected.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { signResendPayload } from '@/lib/resendSignatureTestUtils'

const H = vi.hoisted(() => {
  const ARCHIVE_ID = 'archive-under-test'
  type Call = { table: string; op: string; payload: unknown }
  const calls: Call[] = []
  let sessionRow: Record<string, unknown> | null = null

  // The whole point of the gate is that the fetch never happens, so the vendor
  // call is counted rather than just stubbed.
  let receivingCalls = 0
  let receivingResult: unknown = { data: { text: 'fetched body text', html: null }, error: null, headers: null }

  function setSession(row: Record<string, unknown> | null) { sessionRow = row }
  function setReceiving(r: unknown) { receivingResult = r }
  function reset() { calls.length = 0; sessionRow = null; receivingCalls = 0 }
  function fetchCount() { return receivingCalls }

  function makeBuilder(table: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: unknown = null
    const b: Record<string, unknown> = {}

    b.select = () => b
    b.insert = (p: unknown) => { op = 'insert'; payload = p; return b }
    b.update = (p: unknown) => { op = 'update'; payload = p; return b }
    b.delete = () => { op = 'delete'; return b }
    for (const m of ['eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'gte', 'lte', 'gt', 'lt', 'match', 'like', 'filter']) {
      b[m] = () => b
    }

    const terminal = () => {
      calls.push({ table, op, payload })
      if (table === 'email_reply_sessions' && op === 'select') return { data: sessionRow, error: null }
      if (table === 'owner_deposits' && op === 'insert') {
        return { data: { id: 'deposit-1', archive_id: ARCHIVE_ID, prompt: 'q', response: 'a', source_type: 'email_reply' }, error: null }
      }
      return { data: null, error: null }
    }

    b.single      = async () => terminal()
    b.maybeSingle = async () => terminal()
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      calls.push({ table, op, payload })
      return Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
    }
    return b
  }

  const sent: Array<Record<string, unknown>> = []
  const resend = {
    emails: {
      send: async (m: Record<string, unknown>) => { sent.push(m); return {} },
      receiving: {
        get: async () => { receivingCalls++; return receivingResult },
      },
    },
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { ARCHIVE_ID, calls, sent, setSession, setReceiving, reset, fetchCount, supabaseAdmin, resend }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('@/lib/resend', () => ({ resend: H.resend }))
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
    replied: false, question_history_id: 777,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
    archives: { id: H.ARCHIVE_ID, name: 'The Test Archive', owner_name: 'Owner Name', owner_email: 'owner@example.com', preferred_language: 'en' },
    contributors: null,
    ...over,
  }
}

function post(body: Record<string, unknown>) {
  const raw = JSON.stringify(body)
  return new NextRequest('https://basalith.ai/api/resend/inbound', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...signResendPayload(raw, SECRET) },
    body:    raw,
  })
}

/**
 * An outbound email event, in the shape resend@6.9.4 declares for it. The
 * email_id is an OUTBOUND id and sits under `data`, which is precisely why it
 * used to reach the receiving fetch.
 */
const outbound = (type: string) => post({
  type,
  created_at: '2026-08-07T21:00:41.487Z',
  data: {
    email_id:   '58e5b958-7f6b-42e6-ad60-a7af29254e30',
    created_at: '2026-08-07T21:00:41.487Z',
    from:       'The Hoa Le Tran Archive <archive@basalith.xyz>',
    to:         ['mrdavidha@gmail.com'],
    subject:    'A question from the archive · The Hoa Le Tran Archive',
  },
})

/** A genuine inbound reply: an id and no body, so the fetch has to run. */
const received = () => post({
  type:       'email.received',
  created_at: '2026-08-07T21:05:00.000Z',
  data: {
    email_id:   'inbound-email-id',
    from:       'Owner Name <owner@example.com>',
    to:         [`reply+${TOKEN}@reply.basalith.ai`],
    subject:    '',
    message_id: '<abc@mail.example>',
  },
})

beforeEach(() => {
  H.reset()
  H.sent.length = 0
  H.setReceiving({ data: { text: 'fetched body text', html: null }, error: null, headers: null })
})

describe('1. an outbound event is turned away before the fetch', () => {
  // Every non-received type the endpoint is actually subscribed to.
  const OTHER_TYPES = [
    'email.sent', 'email.scheduled', 'email.delivered', 'email.delivery_delayed',
    'email.complained', 'email.bounced', 'email.opened', 'email.clicked',
    'email.failed', 'email.suppressed',
    'contact.created', 'contact.updated', 'contact.deleted',
    'domain.created', 'domain.updated', 'domain.deleted',
  ]

  for (const type of OTHER_TYPES) {
    it(`skips ${type} with 200, no fetch, no database contact`, async () => {
      H.setSession(session())

      const res = await POST(outbound(type))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, skipped: 'event type not handled' })
      expect(H.fetchCount()).toBe(0)
      expect(H.calls).toHaveLength(0)
      expect(H.sent).toHaveLength(0)
    })
  }

  it('answers 200 and not 500, so Resend stops retrying the notification', async () => {
    // The regression: a 500 here is what turned 13 delivered notifications into
    // 101 requests across four retry rounds.
    H.setSession(session())

    const res = await POST(outbound('email.delivered'))

    expect(res.status).not.toBe(500)
    expect(res.status).toBe(200)
  })

  it('is not fooled by an outbound id that would 404 on the receiving store', async () => {
    // Belt and braces: even with the receiving store set to fail, the gate must
    // have returned before anything asked it.
    H.setSession(session())
    H.setReceiving({ data: null, error: { name: 'not_found', statusCode: 404, message: 'Inbound email not found' }, headers: null })

    const res = await POST(outbound('email.delivered'))

    expect(res.status).toBe(200)
    expect(H.fetchCount()).toBe(0)
  })
})

describe('2. a real email.received is unaffected', () => {
  it('runs the fetch and saves the deposit', async () => {
    H.setSession(session())
    H.setReceiving({ data: { text: 'Grandma made the pastry by hand every Sunday.', html: null }, error: null, headers: null })

    const res = await POST(received())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, saved: 'owner_daily' })
    expect(H.fetchCount()).toBe(1)

    const insert = H.calls.find(c => c.table === 'owner_deposits' && c.op === 'insert')
    expect((insert?.payload as { response: string }).response)
      .toBe('Grandma made the pastry by hand every Sunday.')
    expect(H.sent).toHaveLength(1)
  })

  it('still returns 500 when the receiving fetch genuinely fails', async () => {
    // The gate must not have swallowed the failure path it sits in front of.
    H.setSession(session())
    H.setReceiving({ data: null, error: { name: 'not_found', statusCode: 404, message: 'Inbound email not found' }, headers: null })

    const res = await POST(received())

    expect(res.status).toBe(500)
    expect(H.fetchCount()).toBe(1)
  })
})

describe('3. a payload with no type at all proceeds', () => {
  /**
   * Deliberate, and the safe direction. The only irreversible outcome in this
   * handler is losing a family memory, so an unrecognised payload that might be
   * a reply reaches the token gate rather than being dropped at the door. An
   * untyped payload that is not a reply costs nothing: it resolves to no live
   * token and writes nothing.
   */
  it('treats an untyped payload carrying a reply as a reply', async () => {
    H.setSession(session())

    const res = await POST(post({
      from: 'Owner Name <owner@example.com>',
      to:   `reply+${TOKEN}@reply.basalith.ai`,
      text: 'This is my memory of that day.',
    }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, saved: 'owner_daily' })
    expect(H.calls.some(c => c.table === 'owner_deposits' && c.op === 'insert')).toBe(true)
  })

  it('keeps the untyped wrapped shape working through the fetch path', async () => {
    // This is the shape scripts/inbound-signature-probe.ts and the existing
    // failure-path tests post. If absence of a type were treated as "not
    // received", that probe would still see 200 while proving nothing.
    H.setSession(session())

    const res = await POST(post({
      data: {
        email_id: 'inbound-email-id',
        from:     'Owner Name <owner@example.com>',
        to:       [`reply+${TOKEN}@reply.basalith.ai`],
      },
    }))

    expect(res.status).toBe(200)
    expect(H.fetchCount()).toBe(1)
  })
})

describe('4. the gate reads the type at either level', () => {
  it('skips when the type arrives nested under data', async () => {
    // resend@6.9.4 puts `type` at the top level. This file already absorbs
    // Resend shipping the same fields wrapped and unwrapped, so a gate that
    // inspected one level only would fail open on the other.
    H.setSession(session())

    const res = await POST(post({
      data: {
        type:     'email.delivered',
        email_id: '58e5b958-7f6b-42e6-ad60-a7af29254e30',
        from:     'The Hoa Le Tran Archive <archive@basalith.xyz>',
        to:       ['mrdavidha@gmail.com'],
      },
    }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, skipped: 'event type not handled' })
    expect(H.fetchCount()).toBe(0)
    expect(H.calls).toHaveLength(0)
  })

  it('ignores a non-string type rather than throwing', async () => {
    H.setSession(session())

    const res = await POST(post({
      type: { not: 'a string' },
      from: 'Owner Name <owner@example.com>',
      to:   `reply+${TOKEN}@reply.basalith.ai`,
      text: 'This is my memory of that day.',
    }))

    // Falls through to the untyped rule, which proceeds.
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, saved: 'owner_daily' })
  })
})
