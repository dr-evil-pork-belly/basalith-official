/**
 * Reply token expiry, at the handler boundary.
 *
 * The point of these tests is not that an expired token is refused. It is that
 * an expired token is refused with a response indistinguishable from an unknown
 * one. Expiry that announces itself is an oracle: it tells anyone probing tokens
 * which ones were ever real.
 *
 * The live-database version of the same assertions is scripts/reply-expiry-probe.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => {
  const ARCHIVE_ID = 'archive-under-test'
  type Call = { table: string; op: string; payload: unknown }
  const calls: Call[] = []
  let sessionRow: Record<string, unknown> | null = null
  let sessionError: { message: string } | null = null

  function setSession(row: Record<string, unknown> | null) { sessionRow = row }
  function setSessionError(e: { message: string } | null) { sessionError = e }
  function reset() { calls.length = 0; sessionRow = null; sessionError = null }

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

    const record = () => { calls.push({ table, op, payload }) }

    const terminal = () => {
      record()
      if (table === 'email_reply_sessions' && op === 'select') {
        return sessionError ? { data: null, error: sessionError } : { data: sessionRow, error: null }
      }
      if (table === 'owner_deposits' && op === 'insert') {
        return { data: { id: 'deposit-1', archive_id: ARCHIVE_ID, prompt: 'q', response: 'a', source_type: 'email_reply' }, error: null }
      }
      if (table === 'archives' && op === 'select') {
        return { data: { id: ARCHIVE_ID, name: 'The Test Archive', owner_email: 'owner@example.com', owner_name: 'Owner Name' }, error: null }
      }
      if (table === 'email_sessions' && op === 'select') return { data: null, error: null }
      return { data: null, error: null }
    }

    b.single      = async () => terminal()
    b.maybeSingle = async () => terminal()
    // List queries terminate on await rather than on .single()/.maybeSingle(),
    // so this path has to be table-aware too. The contributor roster is read
    // this way by sendReplyExpiredNotice.
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      record()
      const listed = table === 'contributors' && op === 'select'
        ? [{ email: 'cousin@example.com', name: 'Cousin Name' }]
        : []
      return Promise.resolve({ data: listed, error: null, count: listed.length }).then(res, rej)
    }
    return b
  }

  const sent: Array<Record<string, unknown>> = []
  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { ARCHIVE_ID, calls, sent, setSession, setSessionError, reset, supabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('@/lib/resend', () => ({ resend: { emails: { send: async (m: Record<string, unknown>) => { H.sent.push(m); return {} } } } }))
vi.mock('@/lib/trainingPipeline', () => ({ createTrainingPairFromDeposit: vi.fn(async () => {}) }))
vi.mock('@/lib/classifyDeposit', () => ({ classifyDeposit: vi.fn(async () => {}) }))
vi.mock('@/lib/memoryChain', () => ({ triggerMemoryChain: vi.fn(async () => {}) }))

import { POST } from '@/app/api/resend/inbound/route'

const TOKEN = 'aabbccddeeff001122334455'
const DAY   = 24 * 60 * 60 * 1000

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

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/resend/inbound', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const inbound = (token: string, from = 'Owner Name <owner@example.com>') =>
  req({ from, to: `reply+${token}@reply.basalith.ai`, text: 'This is my memory of that day.' })

beforeEach(() => { H.reset(); H.sent.length = 0 })

describe('reply token expiry at the inbound boundary', () => {
  it('accepts a live token and writes a deposit', async () => {
    H.setSession(session())
    const res  = await POST(inbound(TOKEN))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, saved: 'owner_daily' })
    expect(H.calls.some(c => c.table === 'owner_deposits' && c.op === 'insert')).toBe(true)
  })

  it('refuses an expired token and writes no deposit', async () => {
    H.setSession(session({ expires_at: new Date(Date.now() - DAY).toISOString() }))
    const res = await POST(inbound(TOKEN))

    expect(res.status).toBe(200)
    expect(H.calls.some(c => c.table === 'owner_deposits' && c.op === 'insert')).toBe(false)
  })

  it('treats a null expires_at as expired, never as unlimited', async () => {
    H.setSession(session({ expires_at: null }))
    const res = await POST(inbound(TOKEN))

    expect(res.status).toBe(200)
    expect(H.calls.some(c => c.table === 'owner_deposits' && c.op === 'insert')).toBe(false)
  })

  it('returns a byte-identical response for expired, unknown, and already-replied', async () => {
    H.setSession(session({ expires_at: new Date(Date.now() - DAY).toISOString() }))
    const expired = await POST(inbound(TOKEN))
    const expiredBody = await expired.text()

    H.reset()
    H.setSession(null)
    const unknown = await POST(inbound('000000000000000000000000'))
    const unknownBody = await unknown.text()

    H.reset()
    H.setSession(session({ replied: true }))
    const replayed = await POST(inbound(TOKEN))
    const replayedBody = await replayed.text()

    expect(expired.status).toBe(unknown.status)
    expect(replayed.status).toBe(unknown.status)
    expect(expiredBody).toBe(unknownBody)
    expect(replayedBody).toBe(unknownBody)
  })

  it('surfaces a database read failure as 500 instead of reporting an unknown token', async () => {
    H.setSessionError({ message: 'connection reset' })
    const res = await POST(inbound(TOKEN))

    expect(res.status).toBe(500)
    expect(H.calls.some(c => c.table === 'owner_deposits' && c.op === 'insert')).toBe(false)
  })
})

describe('expired-token courtesy notice', () => {
  it('emails an on-file owner address, quoting the reply back', async () => {
    H.setSession(session({ expires_at: new Date(Date.now() - DAY).toISOString() }))
    await POST(inbound(TOKEN, 'Owner Name <owner@example.com>'))

    expect(H.sent).toHaveLength(1)
    expect(H.sent[0].to).toBe('owner@example.com')
    expect(String(H.sent[0].text)).toContain('This is my memory of that day.')
    expect(String(H.sent[0].html)).toContain('This is my memory of that day.')
  })

  it('emails an on-file contributor address', async () => {
    H.setSession(session({ expires_at: new Date(Date.now() - DAY).toISOString() }))
    await POST(inbound(TOKEN, 'Cousin Name <cousin@example.com>'))

    expect(H.sent).toHaveLength(1)
    expect(H.sent[0].to).toBe('cousin@example.com')
  })

  it('stays silent for a sender who is not on file, so it cannot be used as an oracle', async () => {
    H.setSession(session({ expires_at: new Date(Date.now() - DAY).toISOString() }))
    await POST(inbound(TOKEN, 'Someone Else <attacker@example.com>'))

    expect(H.sent).toHaveLength(0)
  })

  it('never sends to the inbound from header, only to the address on file', async () => {
    // Same local part, different domain. A naive implementation that replied to
    // `from` would leak here.
    H.setSession(session({ expires_at: new Date(Date.now() - DAY).toISOString() }))
    await POST(inbound(TOKEN, 'Spoofed <owner@evil.example>'))

    expect(H.sent).toHaveLength(0)
  })
})
