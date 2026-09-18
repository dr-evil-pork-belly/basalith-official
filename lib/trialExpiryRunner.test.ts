import { describe, it, expect } from 'vitest'
import { runTrialExpiryForArchive } from './trialExpiryRunner'
import { DELETE_ORDER, type DeleteStep } from './trialExpiry'

// A recorded Supabase-shaped client, handed in as a dependency (no vi.mock).
// Tables are plain arrays; every chain the runner uses resolves against them.
// Storage is empty unless given. auth.admin.deleteUser is recorded.

const ID    = 'aaaaaaaa-0000-4000-8000-000000000001'
const UID   = 'bbbbbbbb-0000-4000-8000-000000000002'
const EMAIL = 'person@example.com'
const NOW   = new Date('2026-10-18T16:00:00Z')

type Rows = Record<string, Record<string, unknown>[]>

function fake(rows: Rows, opts: { storage?: Record<string, string[]>; deleteUserError?: string } = {}) {
  const ops: string[] = []
  const deletedUsers: string[] = []
  const removed: Record<string, string[]> = {}

  function matches(row: Record<string, unknown>, filters: [string, 'eq' | 'is', unknown][]) {
    return filters.every(([col, op, v]) => (op === 'eq' ? row[col] === v : row[col] === v))
  }

  function query(table: string) {
    const filters: [string, 'eq' | 'is', unknown][] = []
    let mode: 'select' | 'update' | 'delete' = 'select'
    let head = false
    let patch: Record<string, unknown> = {}
    const chain: Record<string, unknown> = {}
    const rowsFor = () => (rows[table] ?? []).filter(r => matches(r, filters))
    const run = () => {
      if (mode === 'select') {
        const data = rowsFor()
        return { data: head ? null : data, count: data.length, error: null }
      }
      if (mode === 'update') {
        const hit = rowsFor()
        ops.push(`update ${table} ${hit.length}`)
        for (const r of hit) Object.assign(r, patch)
        return { data: hit.map(r => ({ id: r.id })), error: null }
      }
      const hit = rowsFor()
      ops.push(`delete ${table} ${hit.length}`)
      rows[table] = (rows[table] ?? []).filter(r => !hit.includes(r))
      // The cascade, for the tables the runner counts afterward.
      if (table === 'archives') {
        for (const child of ['owner_deposits', 'incident_sessions', 'training_pairs']) {
          rows[child] = (rows[child] ?? []).filter(r => !hit.some(a => a.id === r.archive_id))
        }
      }
      return { data: hit.map(r => ({ id: r.id })), error: null }
    }
    chain.select = (_cols?: string, o?: { count?: string; head?: boolean }) => { if (mode === 'select') head = !!o?.head; return chain }
    chain.update = (p: Record<string, unknown>) => { mode = 'update'; patch = p; return chain }
    chain.delete = () => { mode = 'delete'; return chain }
    chain.eq = (col: string, v: unknown) => { filters.push([col, 'eq', v]); return chain }
    chain.is = (col: string, v: unknown) => { filters.push([col, 'is', v]); return chain }
    chain.maybeSingle = async () => { const r = run(); return { data: (r.data as unknown[])?.[0] ?? null, error: null } }
    chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej)
    return chain
  }

  const storage = {
    from: (bucket: string) => ({
      list: async (prefix: string) => {
        const names = removed[bucket] ? [] : (opts.storage?.[bucket] ?? [])
        void prefix
        return { data: names.map(n => ({ name: n, id: 'obj' })), error: null }
      },
      remove: async (paths: string[]) => { removed[bucket] = paths; ops.push(`remove ${bucket} ${paths.length}`); return { data: null, error: null } },
    }),
  }
  const auth = {
    admin: {
      deleteUser: async (uid: string) => {
        deletedUsers.push(uid)
        return { data: null, error: opts.deleteUserError ? { message: opts.deleteUserError } : null }
      },
    },
  }
  return { client: { from: query, storage, auth } as never, ops, deletedUsers, rows }
}

function trialRows(over: Partial<Record<string, unknown>> = {}): Rows {
  return {
    archives: [{
      id: ID, name: 'Person Archive', status: 'trial', owner_user_id: UID, owner_email: EMAIL,
      trial_expires_at: '2026-10-18T03:31:00Z', scheduled_deletion_at: null, termination_requested_at: null, ...over,
    }],
    owner_deposits:       [{ id: 'd1', archive_id: ID, contributor_id: null }, { id: 'd2', archive_id: ID, contributor_id: null }],
    incident_sessions:    [{ id: 'i1', archive_id: ID }],
    training_pairs:       [{ id: 't1', archive_id: ID }],
    email_replies:        [{ id: 'e1', archive_id: ID }],
    archive_applications: [{ id: 'a1', email: EMAIL, status: 'trial' }, { id: 'a2', email: EMAIL, status: 'pending' }],
    storage_backup_objects: [],
    contributors: [], successors: [], archivists: [],
    profiles: [{ id: UID }],
  }
}

function deps(f: ReturnType<typeof fake>) {
  const steps: DeleteStep[] = []
  const notices: { subject: string; text: string }[] = []
  return {
    steps, notices,
    d: {
      supabaseAdmin: f.client,
      notify: async (n: { subject: string; text: string }) => { notices.push(n) },
      runStep: async <T,>(name: DeleteStep, fn: () => Promise<T>) => { steps.push(name); return fn() },
      log: () => {},
      now: () => NOW,
    },
  }
}

describe('runTrialExpiryForArchive', () => {
  it('runs every step in DELETE_ORDER, purges storage, cascades, deletes the user, and notifies with the domain only', async () => {
    const f = fake(trialRows(), { storage: { 'voice-recordings': ['1.webm'] } })
    const { d, steps, notices } = deps(f)
    const out = await runTrialExpiryForArchive(ID, d)

    expect(steps).toEqual([...DELETE_ORDER])
    expect(out.stoppedAt).toBeNull()
    expect(out.storageTotal).toBe(1)
    expect(out.depositsAtDeletion).toBe(2)
    expect(out.after).toEqual({ owner_deposits: 0, incident_sessions: 0, training_pairs: 0 })
    expect(out.userDeleted).toBe(true)
    expect(f.deletedUsers).toEqual([UID])
    expect(f.rows.archives).toEqual([])
    expect(f.rows.email_replies).toEqual([])
    expect(f.rows.profiles).toEqual([])
    // Only the trial application row goes; the pending one for the same email stays.
    expect(f.rows.archive_applications.map(a => a.id)).toEqual(['a2'])
    expect(f.rows.archives).toEqual([])
    expect(notices).toHaveLength(1)
    expect(notices[0].subject).toContain('Trial expired and deleted')
    expect(notices[0].text).toContain('example.com')
    expect(notices[0].text).not.toContain(EMAIL)
    // termination_requested_at was set before the purge ran.
    expect(f.ops.indexOf('update archives 1')).toBeLessThan(f.ops.indexOf('remove voice-recordings 1'))
  })

  it('stops at assert_no_b2 when the manifest holds rows for the id: no deletes, one notice, no later steps', async () => {
    const rows = trialRows()
    rows.storage_backup_objects = [{ id: 'm1', archive_id: ID }]
    const f = fake(rows)
    const { d, steps, notices } = deps(f)
    const out = await runTrialExpiryForArchive(ID, d)

    expect(out.stoppedAt).toBe('assert_no_b2')
    expect(out.b2Objects).toBe(1)
    expect(steps).toEqual(['mark_terminated', 'purge_storage', 'assert_no_b2'])
    expect(notices).toHaveLength(1)
    expect(notices[0].subject).toContain('Trial has B2 objects, not deleted')
    expect(f.rows.archives).toHaveLength(1)
    expect(f.rows.email_replies).toHaveLength(1)
    expect(f.deletedUsers).toEqual([])
    expect(f.ops.filter(o => o.startsWith('delete'))).toEqual([])
  })

  it('keeps the auth user and profile when the user owns another archive or holds another role', async () => {
    const rows = trialRows()
    rows.contributors = [{ id: 'c1', email: EMAIL, archive_id: 'other' }]
    const f = fake(rows)
    const { d, notices } = deps(f)
    const out = await runTrialExpiryForArchive(ID, d)

    expect(out.userDeleted).toBe(false)
    expect(out.userKeptReason).toContain('"contributorRows":1')
    expect(f.deletedUsers).toEqual([])
    expect(f.rows.profiles).toHaveLength(1)
    expect(f.rows.archives).toEqual([])
    expect(notices[0].text).toContain('Auth user deleted: no')
  })

  it('refuses in mark_terminated: a non-trial, an owner-terminated archive, an unexpired trial', async () => {
    for (const [over, msg] of [
      [{ status: 'active' }, /not trial/],
      [{ scheduled_deletion_at: '2027-09-17T00:00:00Z' }, /owner-terminated/],
      [{ trial_expires_at: '2026-10-19T00:00:00Z' }, /has not expired/],
    ] as [Record<string, unknown>, RegExp][]) {
      const f = fake(trialRows(over))
      const { d, steps } = deps(f)
      await expect(runTrialExpiryForArchive(ID, d)).rejects.toThrow(msg)
      expect(steps).toEqual(['mark_terminated'])
      expect(f.rows.archives).toHaveLength(1)
    }
  })

  it('a second execution on an already deleted archive is a no-op that still notifies nothing new', async () => {
    const f = fake({ ...trialRows(), archives: [] })
    const { d, steps } = deps(f)
    const out = await runTrialExpiryForArchive(ID, d)
    expect(steps).toEqual([...DELETE_ORDER])
    expect(out.userDeleted).toBe(false)
    expect(out.userKeptReason).toContain('no owner_user_id')
    expect(f.deletedUsers).toEqual([])
  })

  it('treats a deleteUser "not found" as already done, and any other error as a failure', async () => {
    const ok = fake(trialRows(), { deleteUserError: 'User not found' })
    await expect(runTrialExpiryForArchive(ID, deps(ok).d)).resolves.toMatchObject({ userDeleted: true })

    const bad = fake(trialRows(), { deleteUserError: 'service unavailable' })
    await expect(runTrialExpiryForArchive(ID, deps(bad).d)).rejects.toThrow(/deleteUser: service unavailable/)
  })
})
