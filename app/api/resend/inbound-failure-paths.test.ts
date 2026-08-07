/**
 * The two ways an inbound reply used to be lost silently.
 *
 * Both had the same signature: the handler answered 200, Resend recorded a
 * successful delivery and never retried, and a family's memory was gone with
 * only a log line to show for it.
 *
 *   1. The Receiving API fetch failed. The old guessing chain
 *      (`text ?? plain_text ?? body ?? content`) degraded a Resend error
 *      envelope to '', which is indistinguishable from an email with no body,
 *      so it fell into the empty-reply skip and returned 200.
 *
 *   2. The owner_deposits insert failed. The error was logged and the handler
 *      carried on, marking the single-use token replied (burning it forever)
 *      and emailing the family "Your memory has been saved" with nothing saved.
 *
 * What is asserted here is the inverse of each, and in both cases the three
 * things that must be true together: 500 rather than 200, the token still live,
 * and no confirmation sent. The status alone is not the fix. A 500 that still
 * burned the token would be no better for the family.
 *
 * The vendor boundary (@/lib/resend) is what gets mocked, so the real
 * fetchReceivedEmail runs against a real Resend response envelope.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { signResendPayload } from '@/lib/resendSignatureTestUtils'

const H = vi.hoisted(() => {
  const ARCHIVE_ID = 'archive-under-test'
  type Call = { table: string; op: string; payload: unknown }
  const calls: Call[] = []
  let sessionRow: Record<string, unknown> | null = null
  let depositFails = false

  function setSession(row: Record<string, unknown> | null) { sessionRow = row }
  function failDeposit(v: boolean) { depositFails = v }
  function reset() { calls.length = 0; sessionRow = null; depositFails = false }

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
        return depositFails
          ? { data: null, error: { message: 'duplicate key value violates unique constraint' } }
          : { data: { id: 'deposit-1', archive_id: ARCHIVE_ID, prompt: 'q', response: 'a', source_type: 'email_reply' }, error: null }
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

  // The Resend vendor boundary. `receivingResult` is whatever the SDK envelope
  // should be for the next call: a success envelope, an error envelope, or a
  // thrown request.
  const sent: Array<Record<string, unknown>> = []
  let receivingResult: unknown = { data: { text: 'fetched body text', html: null }, error: null, headers: null }
  let receivingThrows: Error | null = null
  function setReceiving(r: unknown) { receivingResult = r; receivingThrows = null }
  function setReceivingThrows(e: Error) { receivingThrows = e }

  const resend = {
    emails: {
      send: async (m: Record<string, unknown>) => { sent.push(m); return {} },
      receiving: {
        get: async () => {
          if (receivingThrows) throw receivingThrows
          return receivingResult
        },
      },
    },
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { ARCHIVE_ID, calls, sent, setSession, failDeposit, reset, supabaseAdmin, resend, setReceiving, setReceivingThrows }
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

/** A signed request. `body` decides whether the handler must fetch the body. */
function post(body: Record<string, unknown>) {
  const raw = JSON.stringify(body)
  return new NextRequest('https://basalith.ai/api/resend/inbound', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...signResendPayload(raw, SECRET) },
    body:    raw,
  })
}

/** The real webhook shape: an id and no body, so the fetch has to run. */
const needsFetch = () => post({
  data: {
    email_id:   'inbound-email-id',
    from:       'Owner Name <owner@example.com>',
    to:         [`reply+${TOKEN}@reply.basalith.ai`],
    subject:    '',
    message_id: '<abc@mail.example>',
  },
})

/** A payload that inlines the text, so the fetch is skipped. */
const inlined = () => post({
  from: 'Owner Name <owner@example.com>',
  to:   `reply+${TOKEN}@reply.basalith.ai`,
  text: 'This is my memory of that day.',
})

const markedReplied = () =>
  H.calls.some(c => c.table === 'email_reply_sessions' && c.op === 'update' &&
    (c.payload as { replied?: boolean } | null)?.replied === true)

const insertedDeposit = () =>
  H.calls.some(c => c.table === 'owner_deposits' && c.op === 'insert')

/** The four type-specific writes, by the table each one touches. */
const TYPE_SPECIFIC = ['contributor_questions', 'daily_spark_responses', 'contributor_story_prompts', 'labels']

const typeSpecificWrites = () =>
  H.calls.filter(c => TYPE_SPECIFIC.includes(c.table) && c.op !== 'select')

const indexOf = (table: string, op: string) =>
  H.calls.findIndex(c => c.table === table && c.op === op)

beforeEach(() => {
  H.reset()
  H.sent.length = 0
  H.setReceiving({ data: { text: 'fetched body text', html: null }, error: null, headers: null })
})

describe('1. a failed Receiving API fetch', () => {
  it('returns 500, not the 200 that told Resend never to retry', async () => {
    H.setSession(session())
    H.setReceiving({ data: null, error: { name: 'not_found', statusCode: 404, message: 'Email not found' }, headers: null })

    const res = await POST(needsFetch())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal error' })
  })

  it('leaves the token live and sends no confirmation', async () => {
    H.setSession(session())
    H.setReceiving({ data: null, error: { name: 'not_found', statusCode: 404, message: 'Email not found' }, headers: null })

    await POST(needsFetch())

    expect(markedReplied()).toBe(false)
    expect(insertedDeposit()).toBe(false)
    expect(H.sent).toHaveLength(0)
  })

  it('refuses before it reads the database at all', async () => {
    H.setSession(session())
    H.setReceiving({ data: null, error: { name: 'not_found', statusCode: 404, message: 'Email not found' }, headers: null })

    await POST(needsFetch())

    // The fetch happens before the token is resolved, so nothing is touched.
    expect(H.calls).toHaveLength(0)
  })

  it('treats a thrown request the same as an error envelope', async () => {
    H.setSession(session())
    H.setReceivingThrows(new Error('socket hang up'))

    const res = await POST(needsFetch())

    expect(res.status).toBe(500)
    expect(H.calls).toHaveLength(0)
    expect(H.sent).toHaveLength(0)
  })

  it('does not ingest an error payload that happens to carry a body field', async () => {
    // The old chain was `?? resendEmail.body ?? resendEmail.content`. An error
    // shape with either key would have been stored verbatim as the memory.
    H.setSession(session())
    H.setReceiving({
      data:  null,
      error: { name: 'application_error', statusCode: 500, message: 'boom' },
      body:  'THIS MUST NEVER BECOME A DEPOSIT',
      headers: null,
    })

    const res = await POST(needsFetch())

    expect(res.status).toBe(500)
    expect(insertedDeposit()).toBe(false)
    expect(JSON.stringify(H.calls)).not.toContain('THIS MUST NEVER BECOME A DEPOSIT')
  })

  it('still skips with 200 when the fetch succeeds and the email genuinely has no body', async () => {
    // Failure is not emptiness, and emptiness is not failure. An empty email is
    // nothing to retry.
    H.setSession(session())
    H.setReceiving({ data: { text: '', html: null }, error: null, headers: null })

    const res = await POST(needsFetch())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, skipped: 'empty reply' })
    expect(markedReplied()).toBe(false)
    expect(H.sent).toHaveLength(0)
  })

  it('accepts a successful fetch and saves the fetched text', async () => {
    H.setSession(session())
    H.setReceiving({ data: { text: 'Grandma made the pastry by hand every Sunday.', html: null }, error: null, headers: null })

    const res = await POST(needsFetch())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, saved: 'owner_daily' })

    const insert = H.calls.find(c => c.table === 'owner_deposits' && c.op === 'insert')
    expect((insert?.payload as { response: string }).response)
      .toBe('Grandma made the pastry by hand every Sunday.')
    expect(markedReplied()).toBe(true)
    expect(H.sent).toHaveLength(1)
  })
})

describe('2. a failed owner_deposits insert', () => {
  it('returns 500 instead of reporting success', async () => {
    H.setSession(session())
    H.failDeposit(true)

    const res = await POST(inlined())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal error' })
  })

  it('leaves the single-use token live so the reply can still land', async () => {
    H.setSession(session())
    H.failDeposit(true)

    await POST(inlined())

    expect(insertedDeposit()).toBe(true)   // it was attempted
    expect(markedReplied()).toBe(false)    // and the token was not burned
  })

  it('never tells the family their memory was saved when it was not', async () => {
    H.setSession(session())
    H.failDeposit(true)

    await POST(inlined())

    expect(H.sent).toHaveLength(0)
  })

  it('does not link a question_history row to a deposit that does not exist', async () => {
    H.setSession(session({ question_history_id: 777 }))
    H.failDeposit(true)

    await POST(inlined())

    expect(H.calls.some(c => c.table === 'question_history' && c.op === 'update')).toBe(false)
  })

  it('still does all of that on the happy path', async () => {
    H.setSession(session())

    const res = await POST(inlined())

    expect(res.status).toBe(200)
    expect(markedReplied()).toBe(true)
    expect(H.sent).toHaveLength(1)
    expect(String(H.sent[0].subject)).toContain('Your memory has been saved')
    expect(H.calls.some(c => c.table === 'question_history' && c.op === 'update')).toBe(true)
  })
})

/**
 * The deposit is the only write here that can fail the request, so it has to be
 * the first one. Everything after it is log-and-continue, and two of the four
 * type-specific writes (daily_spark_responses, labels) are plain inserts with no
 * conflict guard. When the deposit ran last, a deposit failure answered 500
 * having already written a spark response or a photo label, and the Resend retry
 * duplicated that row.
 *
 * What is asserted is the shape that makes the handler retryable: on a deposit
 * failure the archive is left exactly as the request found it.
 */
describe('3. the deposit lands before the type-specific writes', () => {
  const CONTRIB = 'contributor-1'
  const contributorRow = { id: CONTRIB, name: 'Sender Name', email: 'sender@example.com' }

  const cases = [
    {
      name:  'spark (non-idempotent insert into daily_spark_responses)',
      over:  { email_type: 'spark', spark_id: 'child_home', contributor_id: CONTRIB, contributors: contributorRow },
      table: 'daily_spark_responses',
      op:    'insert',
    },
    {
      name:  'photograph (non-idempotent insert into labels)',
      over:  { email_type: 'photograph', photograph_id: 'photo-1', contributor_id: CONTRIB, contributors: contributorRow },
      table: 'labels',
      op:    'insert',
    },
    {
      name:  'contributor_question (guarded update)',
      over:  { email_type: 'contributor_question', prompt_id: 'cq-1', contributor_id: CONTRIB, contributors: contributorRow },
      table: 'contributor_questions',
      op:    'update',
    },
    {
      name:  'story_prompt (guarded update)',
      over:  { email_type: 'story_prompt', prompt_id: 'sp-1', contributor_id: CONTRIB, contributors: contributorRow },
      table: 'contributor_story_prompts',
      op:    'update',
    },
  ]

  for (const c of cases) {
    it(`writes nothing to ${c.table} when the deposit fails — ${c.name}`, async () => {
      H.setSession(session(c.over))
      H.failDeposit(true)

      const res = await POST(inlined())

      expect(res.status).toBe(500)
      expect(insertedDeposit()).toBe(true)          // attempted
      expect(typeSpecificWrites()).toEqual([])      // and nothing downstream ran
      expect(markedReplied()).toBe(false)
      expect(H.sent).toHaveLength(0)
    })

    it(`runs the deposit first on the happy path — ${c.name}`, async () => {
      H.setSession(session(c.over))

      const res = await POST(inlined())

      expect(res.status).toBe(200)
      const depositAt = indexOf('owner_deposits', 'insert')
      const siblingAt = indexOf(c.table, c.op)
      expect(depositAt).toBeGreaterThanOrEqual(0)
      expect(siblingAt).toBeGreaterThanOrEqual(0)
      expect(depositAt).toBeLessThan(siblingAt)
    })
  }

  it('leaves an owner reply with no type-specific sibling untouched', async () => {
    // owner_daily has no sibling write at all. Nothing to order, and the deposit
    // failure must still be clean.
    H.setSession(session())
    H.failDeposit(true)

    const res = await POST(inlined())

    expect(res.status).toBe(500)
    expect(typeSpecificWrites()).toEqual([])
    expect(H.calls.filter(c => c.op !== 'select').map(c => `${c.table}.${c.op}`))
      .toEqual(['owner_deposits.insert'])
  })
})
