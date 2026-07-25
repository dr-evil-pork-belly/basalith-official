/**
 * Regression gate for the question-to-deposit link on the inbound email path.
 *
 * Before this slice, the inbound handler did not know which question a reply
 * answered. It marked the most recent unanswered question_history row served
 * within 14 days, which misattributes whenever replies arrive out of order.
 *
 * Now the reply session carries question_history_id, so the handler updates the
 * exact row that was served. The heuristic survives only as the fallback for
 * sessions created before the column existed, which are still in flight.
 *
 * What is asserted here:
 *   1. session WITH question_history_id  -> that exact row is updated, and the
 *                                           heuristic SELECT never runs
 *   2. session WITHOUT question_history_id -> the heuristic still runs and still
 *                                           resolves, so in-flight sessions work
 *   3. contributor reply                 -> question_history is never touched
 *
 * Scope note: this covers the inbound email path only. The B2B founder-portal
 * route (app/api/archive/b2b-question/answer/route.ts) has its own linking path
 * and is deliberately untouched by this slice.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const H = vi.hoisted(() => {
  const ARCHIVE_ID     = 'arch-dr-ha'
  const DEPOSIT_ID     = 'deposit-generated'
  const HEURISTIC_ROW  = 999   // what the 14-day fallback SELECT resolves to

  type Call = { table: string; op: string; payload: unknown; filters: unknown[][] }
  const calls: Call[] = []
  let sessionRow: Record<string, unknown> | null = null

  function setSession(row: Record<string, unknown> | null) { sessionRow = row }
  function reset() { calls.length = 0; sessionRow = null }

  function makeBuilder(table: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
    let payload: unknown = null
    const filters: unknown[][] = []
    const b: Record<string, unknown> = {}

    b.select = () => b
    b.insert = (p: unknown) => { op = 'insert'; payload = p; return b }
    b.update = (p: unknown) => { op = 'update'; payload = p; return b }
    b.delete = () => { op = 'delete'; return b }
    for (const m of ['eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'gte', 'lte', 'match']) {
      b[m] = (col?: unknown, val?: unknown) => { filters.push([m, col, val]); return b }
    }

    const record = () => { calls.push({ table, op, payload, filters: [...filters] }) }

    const terminal = () => {
      record()
      if (table === 'email_reply_sessions' && op === 'select') return { data: sessionRow, error: null }
      if (table === 'owner_deposits' && op === 'insert') {
        return {
          data: { id: DEPOSIT_ID, archive_id: ARCHIVE_ID, prompt: 'q', response: 'a', source_type: 'email_reply' },
          error: null,
        }
      }
      // The 14-day heuristic lookup. Only reached when the fallback runs.
      if (table === 'question_history' && op === 'select') return { data: { id: HEURISTIC_ROW }, error: null }
      return { data: null, error: null }
    }

    b.single      = async () => terminal()
    b.maybeSingle = async () => terminal()
    // Awaitable, filter-terminated queries (the UPDATEs land here).
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      record()
      return Promise.resolve({ data: [], error: null, count: 0 }).then(res, rej)
    }
    return b
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }

  return { ARCHIVE_ID, DEPOSIT_ID, HEURISTIC_ROW, calls, setSession, reset, supabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('@/lib/resend', () => ({ resend: { emails: { send: async () => ({}) } } }))
vi.mock('@/lib/trainingPipeline', () => ({ createTrainingPairFromDeposit: vi.fn(async () => {}) }))
vi.mock('@/lib/classifyDeposit', () => ({ classifyDeposit: vi.fn(async () => {}) }))
vi.mock('@/lib/memoryChain', () => ({ triggerMemoryChain: vi.fn(async () => {}) }))

import { POST } from '@/app/api/resend/inbound/route'

const TOKEN = 'abc123def456'

function baseSession(over: Record<string, unknown> = {}) {
  return {
    id:                  'session-1',
    token:               TOKEN,
    archive_id:          H.ARCHIVE_ID,
    contributor_id:      null,
    email_type:          'owner_daily',
    spark_id:            'What did your home smell like when you were a child?',
    prompt_id:           null,
    photograph_id:       null,
    replied:             false,
    question_history_id: null,
    archives:            { id: H.ARCHIVE_ID, name: 'The Dr Ha Archive', owner_name: 'David Yin Ha', preferred_language: 'en' },
    contributors:        null,
    ...over,
  }
}

function inboundRequest() {
  return new NextRequest('https://basalith.ai/api/resend/inbound', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      to:   `reply+${TOKEN}@reply.basalith.ai`,
      from: 'David Yin Ha <mrdavidha@gmail.com>',
      text: 'It smelled like eucalyptus and the diesel from my fathers truck.',
    }),
  })
}

/** question_history calls, split by operation. */
function historyCalls() {
  const rows = H.calls.filter(c => c.table === 'question_history')
  return {
    selects: rows.filter(c => c.op === 'select'),
    updates: rows.filter(c => c.op === 'update'),
  }
}

/** The value passed to .eq('id', X) on an update call. */
function updatedId(call: { filters: unknown[][] }) {
  const f = call.filters.find(x => x[0] === 'eq' && x[1] === 'id')
  return f?.[2]
}

beforeEach(() => { H.reset() })

describe('inbound reply — question_history linking', () => {
  it('uses question_history_id from the session and does not run the heuristic', async () => {
    H.setSession(baseSession({ question_history_id: 777 }))

    const res = await POST(inboundRequest())
    expect(res.status).toBe(200)

    const { selects, updates } = historyCalls()

    // The exact served row was updated.
    expect(updates).toHaveLength(1)
    expect(updatedId(updates[0])).toBe(777)
    expect(updates[0].payload).toMatchObject({ answered_deposit_id: H.DEPOSIT_ID })
    expect((updates[0].payload as { answered_at: string }).answered_at).toEqual(expect.any(String))

    // The heuristic lookup never happened.
    expect(selects).toHaveLength(0)
  })

  it('falls back to the heuristic when the session carries no question_history_id', async () => {
    H.setSession(baseSession({ question_history_id: null }))

    const res = await POST(inboundRequest())
    expect(res.status).toBe(200)

    const { selects, updates } = historyCalls()

    // The 14-day lookup ran.
    expect(selects).toHaveLength(1)
    const heuristicFilters = selects[0].filters
    expect(heuristicFilters).toContainEqual(['is', 'answered_deposit_id', null])
    expect(heuristicFilters.some(f => f[0] === 'gte' && f[1] === 'served_at')).toBe(true)

    // And its result was the row updated.
    expect(updates).toHaveLength(1)
    expect(updatedId(updates[0])).toBe(H.HEURISTIC_ROW)
  })

  it('never links a contributor reply to an owner question', async () => {
    H.setSession(baseSession({ contributor_id: 'contrib-1', question_history_id: 777 }))

    const res = await POST(inboundRequest())
    expect(res.status).toBe(200)

    const { selects, updates } = historyCalls()
    expect(selects).toHaveLength(0)
    expect(updates).toHaveLength(0)
  })
})
