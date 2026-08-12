/**
 * A dissolution that was never recorded must never be confirmed.
 *
 * Until August 12, 2026 the update at app/api/archive/terminate/route.ts
 * discarded its error. A failed write answered `success: true` and still emailed
 * the owner "Termination request received", naming a deletion date. Nothing was
 * in the database: `termination_requested_at` stayed null, so the backup kept
 * copying the archive, the runbook's date arithmetic had nothing to read, and
 * the one party who could have noticed had been told it was handled. The failure
 * was invisible from every side.
 *
 * The admin email had the same shape one line lower. `} catch {}` meant the only
 * notification that a dissolution had started could vanish without a trace, and
 * DISSOLUTION_RUNBOOK.md section 2 is explicit that nothing else raises a hand.
 *
 * What is asserted here is the inverse of each, and for the failure case it is
 * two things together: 500 rather than 200, AND no owner email. The status alone
 * is not the fix. A 500 that still sent the confirmation would be no better for
 * the family, which is the same lesson as inbound-failure-paths.test.ts.
 *
 * Nothing here reaches Supabase, Resend or a real archive. The vendor boundaries
 * are mocked and the real route body runs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const ARCHIVE_ID = '6c0722d3-719a-423f-9024-621ba0072d6f'
const USER_ID = 'user-under-test'

const H = vi.hoisted(() => {
  const sent: Array<Record<string, unknown>> = []
  const updates: Array<{ payload: unknown }> = []

  // What the update should answer. Default is one row updated, no error.
  let updateResult: { data: unknown; error: { message: string } | null } = {
    data: [{ id: '6c0722d3-719a-423f-9024-621ba0072d6f' }],
    error: null,
  }
  function setUpdateResult(r: { data: unknown; error: { message: string } | null }) {
    updateResult = r
  }

  let archiveRow: Record<string, unknown> | null = null
  function setArchive(row: Record<string, unknown> | null) { archiveRow = row }

  function reset() {
    sent.length = 0
    updates.length = 0
    updateResult = { data: [{ id: '6c0722d3-719a-423f-9024-621ba0072d6f' }], error: null }
    archiveRow = null
  }

  function makeBuilder(table: string) {
    let op: 'select' | 'update' = 'select'
    let selected = ''
    const b: Record<string, unknown> = {}

    b.select = (cols?: string) => { selected = cols ?? ''; return b }
    b.update = (p: unknown) => { op = 'update'; updates.push({ payload: p }); return b }
    for (const m of ['eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'match']) b[m] = () => b

    b.maybeSingle = async () => {
      if (table !== 'archives') return { data: null, error: null }
      // The route reads the archive twice, and the two selects want different
      // shapes. Discriminate on the column list, the way the route does.
      if (selected.includes('owner_user_id')) {
        return { data: archiveRow ? { owner_user_id: archiveRow.owner_user_id } : null, error: null }
      }
      return { data: archiveRow, error: null }
    }
    b.single = b.maybeSingle

    // `.update(...).eq(...).select('id')` is awaited directly, so the builder
    // itself has to be thenable. This is the call under test.
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      const v = op === 'update' ? updateResult : { data: [], error: null }
      return Promise.resolve(v).then(res, rej)
    }

    return b
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  const resend = {
    emails: {
      send: async (m: Record<string, unknown>) => { sent.push(m); return { id: 'email-1' } },
    },
  }

  const getSessionUser = vi.fn(async () => ({
    userId: 'user-under-test',
    email: 'owner@example.com',
    role: 'owner' as const,
    archiveId: '6c0722d3-719a-423f-9024-621ba0072d6f',
  }))

  return { sent, updates, setUpdateResult, setArchive, reset, supabaseAdmin, resend, getSessionUser }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('@/lib/resend', () => ({ resend: H.resend }))
vi.mock('@/lib/auth/getSessionUser', () => ({ getSessionUser: H.getSessionUser }))

import { POST } from '@/app/api/archive/terminate/route'

const post = () =>
  POST(
    new NextRequest('https://basalith.ai/api/archive/terminate', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
      headers: { 'content-type': 'application/json' },
    }),
  )

const ARCHIVE = {
  id: ARCHIVE_ID,
  name: 'Founder Test Archive',
  owner_name: 'Test Owner',
  owner_email: 'owner@example.com',
  preferred_language: 'en',
  termination_requested_at: null,
  owner_user_id: USER_ID,
}

const ownerEmails = () => H.sent.filter((m) => m.to === 'owner@example.com')
const adminEmails = () => H.sent.filter((m) => m.to !== 'owner@example.com')

describe('terminate records the dissolution before it confirms one', () => {
  beforeEach(() => {
    H.reset()
    H.setArchive({ ...ARCHIVE })
  })

  it('the write landing returns success and sends both emails', async () => {
    const res = await post()
    const body = await res.json()
    console.log(`SUCCESS  status=${res.status} body=${JSON.stringify(body)}`)
    console.log(`SUCCESS  emails=${JSON.stringify(H.sent.map((m) => ({ to: m.to, subject: m.subject })))}`)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(typeof body.scheduledDeletionAt).toBe('string')

    // The write actually carried both columns, not just the one the response
    // reports back.
    expect(H.updates).toHaveLength(1)
    const payload = H.updates[0].payload as Record<string, string>
    expect(payload.termination_requested_at).toBeTruthy()
    expect(payload.scheduled_deletion_at).toBe(body.scheduledDeletionAt)

    expect(ownerEmails()).toHaveLength(1)
    expect(adminEmails()).toHaveLength(1)
  })

  it('a failed write returns 500 and sends NO email at all', async () => {
    H.setUpdateResult({ data: null, error: { message: 'permission denied for table archives' } })

    const res = await post()
    const body = await res.json()
    console.log(`DB ERROR status=${res.status} body=${JSON.stringify(body)}`)
    console.log(`DB ERROR emails sent=${H.sent.length}`)

    expect(res.status).toBe(500)
    expect(body.success).toBeUndefined()
    expect(body.error).toBe('Could not record termination request')

    // The part that matters more than the status. The owner is never told a
    // dissolution was scheduled when none was.
    expect(ownerEmails()).toHaveLength(0)
    expect(H.sent).toHaveLength(0)
  })

  it('a zero row update is NOT treated as a failure, and that is deliberate', async () => {
    // A row-count check was written and backed out. The archive is read a few
    // lines above the update, and no code path on this property deletes an
    // archives row, so this is unreachable today. It also cost a mock change
    // inside the owner-guard suite, whose generic builder answers every
    // list-style query with []. Recorded here so the gap is a decision on the
    // record rather than an oversight somebody finds later.
    H.setUpdateResult({ data: [], error: null })

    const res = await post()
    console.log(`ZERO ROW status=${res.status} (documented gap, not a regression)`)
    expect(res.status).toBe(200)
  })

  it('a failed admin alert does not fail the request, because the write landed', async () => {
    // Runbook section 2: this email is the only notification a dissolution has
    // started. It failing is loud in the log and is not a reason to tell the
    // owner their recorded termination failed, which would send them into the
    // 409 on retry.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    H.resend.emails.send = async (m: Record<string, unknown>) => {
      if (m.to !== 'owner@example.com') throw new Error('Resend 503')
      H.sent.push(m)
      return { id: 'email-1' }
    }

    const res = await post()
    const body = await res.json()
    console.log(`ADMIN FAIL status=${res.status} body=${JSON.stringify(body)}`)
    console.log(`ADMIN FAIL console.error=${JSON.stringify(err.mock.calls[0]?.[0])}`)

    expect(res.status).toBe(200)
    expect(ownerEmails()).toHaveLength(1)
    // The empty catch is gone. Something is in the log naming what was lost.
    expect(err).toHaveBeenCalled()
    expect(String(err.mock.calls[0][0])).toContain('ADMIN ALERT FAILED')
    expect(String(err.mock.calls[0][0])).toContain(ARCHIVE_ID)

    err.mockRestore()
    H.resend.emails.send = async (m: Record<string, unknown>) => { H.sent.push(m); return { id: 'email-1' } }
  })

  it('the guards above the write are untouched', async () => {
    // Not a new behavior, asserted so this commit cannot be read as having
    // loosened anything on the way in.
    H.setArchive({ ...ARCHIVE, termination_requested_at: '2026-08-01T00:00:00Z' })
    const res = await post()
    console.log(`RE-REQUEST status=${res.status}`)
    expect(res.status).toBe(409)
    expect(H.sent).toHaveLength(0)
    expect(H.updates).toHaveLength(0)
  })
})
