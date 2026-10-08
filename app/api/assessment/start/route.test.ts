import { describe, it, expect, vi, beforeEach } from 'vitest'

// Behavioral test of POST /api/assessment/start against a small in-memory
// stand in for the four tables it touches. The stand in implements only the
// calls the route makes; anything else throws, so a new query in the route
// fails here instead of passing unseen.

type Row = Record<string, unknown>
const db: Record<string, Row[]> = {}
const failures = { archiveInsert: false, link: false }
const notices: string[] = []
const authCalls: { email: string; force: boolean }[] = []
let nextId = 0

function table(name: string): Row[] {
  if (!(name in db)) throw new Error(`unexpected table ${name}`)
  return db[name]
}

function query(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  let op: 'select' | 'update' | 'insert' | 'delete' = 'select'
  let patch: Row = {}
  let inserted: Row | null = null
  let head = false

  const matches = () => table(name).filter(r => filters.every(f => f(r)))

  const run = (): { data: Row[] | null; error: { message: string } | null; count?: number } => {
    if (op === 'insert') {
      if (name === 'archives' && failures.archiveInsert) return { data: null, error: { message: 'insert refused' } }
      const row = { id: `${name}-${++nextId}`, ...inserted! }
      table(name).push(row)
      return { data: [row], error: null }
    }
    if (op === 'update') {
      if (name === 'dependency_reports' && failures.link && 'archive_id' in patch) {
        return { data: null, error: { message: 'link refused' } }
      }
      const rows = matches()
      rows.forEach(r => Object.assign(r, patch))
      return { data: rows, error: null }
    }
    if (op === 'delete') {
      const rows = matches()
      db[name] = table(name).filter(r => !rows.includes(r))
      return { data: rows, error: null }
    }
    const rows = matches()
    return head ? { data: null, error: null, count: rows.length } : { data: rows, error: null }
  }

  const q = {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) { if (opts?.head) head = true; return q },
    update(p: Row) { op = 'update'; patch = p; return q },
    insert(r: Row) { op = 'insert'; inserted = r; return q },
    delete() { op = 'delete'; return q },
    eq(col: string, val: unknown) { filters.push(r => r[col] === val); return q },
    is(col: string, val: null) { filters.push(r => (r[col] ?? null) === val); return q },
    async maybeSingle() { const out = run(); return { data: out.data?.[0] ?? null, error: out.error } },
    async single() { const out = run(); return { data: out.data?.[0] ?? null, error: out.error } },
    then(resolve: (v: ReturnType<typeof run>) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve().then(run).then(resolve, reject)
    },
  }
  return q
}

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (name: string) => query(name) } }))
vi.mock('@/lib/auth/getOrCreateAuthUser', () => ({
  getOrCreateAuthUser: async (email: string, _role: string, opts: { forceRole?: boolean } = {}) => {
    authCalls.push({ email, force: !!opts.forceRole })
    return `user-${email}`
  },
}))
vi.mock('@/lib/internalNotify', () => ({
  notifyInternal: async (n: { subject: string }) => { notices.push(n.subject) },
}))
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  // Run after() callbacks at once so their sends are observable.
  return { ...actual, after: (fn: () => unknown) => { void fn() } }
})

import { POST } from './route'

const ORDER = '11111111-2222-4333-8444-555555555555'
const EMAIL = 'founder@example.com'
let ipSeq = 0

function post(body: unknown) {
  // A new address per request so the in-memory rate limit never trips.
  const req = new Request('https://basalith.ai/api/assessment/start', {
    method:  'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ipSeq}` },
    body:    JSON.stringify(body),
  })
  return POST(req as never)
}

const flush = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  db.dependency_reports = [{
    id: ORDER, status: 'ordered', archive_id: null,
    founder_name: 'Margaret Chen', founder_email: EMAIL, buyer_name: 'Acquirer Co',
  }]
  db.archives = []
  db.successors = []
  db.archivists = []
  failures.archiveInsert = false
  failures.link = false
  notices.length = 0
  authCalls.length = 0
})

describe('POST /api/assessment/start', () => {
  it('creates one business tier assessment record and links it to the report', async () => {
    const res = await post({ order: ORDER, email: 'Founder@Example.com ' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(db.archives).toHaveLength(1)
    const archive = db.archives[0]
    expect(archive).toMatchObject({
      tier: 'succession', status: 'assessment', owner_email: EMAIL,
      owner_name: 'Margaret Chen', owner_user_id: `user-${EMAIL}`,
      name: 'Chen Basalith', family_name: 'Chen', entity_pipeline: 'grounded',
    })
    expect(db.dependency_reports[0]).toMatchObject({ status: 'capturing', archive_id: archive.id })

    // The role is forced only after every refusal check has passed.
    expect(authCalls).toEqual([{ email: EMAIL, force: false }, { email: EMAIL, force: true }])
    await flush()
    expect(notices).toEqual(['Assessment started: Margaret Chen'])
  })

  it('answers an unknown id, a wrong email, and a malformed request identically, and creates nothing', async () => {
    const cases = [
      { order: '99999999-2222-4333-8444-555555555555', email: EMAIL },
      { order: ORDER, email: 'someone.else@example.com' },
      { order: 'not-a-uuid', email: EMAIL },
      { order: ORDER, email: 'not an email' },
      { order: ORDER },
      null,
    ]
    const bodies: unknown[] = []
    for (const c of cases) {
      const res = await post(c)
      expect(res.status).toBe(404)
      bodies.push(await res.json())
    }
    expect(new Set(bodies.map(b => JSON.stringify(b))).size).toBe(1)
    expect(db.archives).toHaveLength(0)
    expect(db.dependency_reports[0].status).toBe('ordered')
    expect(authCalls).toHaveLength(0)
  })

  it('makes one record when the founder submits twice', async () => {
    const first = await post({ order: ORDER, email: EMAIL })
    const second = await post({ order: ORDER, email: EMAIL })
    expect(await first.json()).toEqual({ ok: true })
    expect(await second.json()).toEqual({ ok: true, existing: true })
    expect(db.archives).toHaveLength(1)
  })

  it('makes one record when two requests race past the read', async () => {
    const [a, b] = await Promise.all([post({ order: ORDER, email: EMAIL }), post({ order: ORDER, email: EMAIL })])
    const bodies = [await a.json(), await b.json()]
    expect(bodies.filter(x => x.existing)).toHaveLength(1)
    expect(db.archives).toHaveLength(1)
    expect(db.dependency_reports[0].archive_id).toBe(db.archives[0].id)
  })

  it('does not mistake the record a first click just made for an existing Basalith', async () => {
    // The state a slow second request sees: it read the row while 'ordered',
    // and by the time it checks for an existing owner the first has finished.
    await post({ order: ORDER, email: EMAIL })
    notices.length = 0
    const stale = { ...db.dependency_reports[0], status: 'ordered', archive_id: null }
    const live = db.dependency_reports[0]
    let reads = 0
    db.dependency_reports = new Proxy([live], {
      get(target, prop, receiver) {
        // First read of the table returns the stale row, every later one the live row.
        if (prop === 'filter') return (fn: (r: Row) => boolean) => (reads++ === 0 ? [stale] : [live]).filter(fn)
        return Reflect.get(target, prop, receiver)
      },
    }) as Row[]

    const res = await post({ order: ORDER, email: EMAIL })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, existing: true })
    expect(db.archives).toHaveLength(1)
    await flush()
    expect(notices).toEqual([])
  })

  it('refuses a founder who already owns a Basalith, forces no role, and tells the founder of Basalith', async () => {
    db.archives.push({ id: 'arch-existing', owner_email: EMAIL, owner_user_id: `user-${EMAIL}`, status: 'active' })
    const res = await post({ order: ORDER, email: EMAIL })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already have a Basalith/)
    expect(db.archives).toHaveLength(1)
    expect(db.dependency_reports[0]).toMatchObject({ status: 'ordered', archive_id: null })
    expect(authCalls).toHaveLength(0)
    await flush()
    expect(notices).toEqual(['Dependency report: founder is already a client'])
  })

  it('refuses a successor or a guide without touching their role', async () => {
    for (const t of ['successors', 'archivists'] as const) {
      db[t] = [{ id: `${t}-1`, auth_user_id: `user-${EMAIL}` }]
      authCalls.length = 0
      const res = await post({ order: ORDER, email: EMAIL })
      expect(res.status, t).toBe(409)
      expect(authCalls, t).toEqual([{ email: EMAIL, force: false }])
      expect(db.archives, t).toHaveLength(0)
      expect(db.dependency_reports[0].status, t).toBe('ordered')
      db[t] = []
    }
  })

  it('undoes the claim when the record cannot be created, so the founder can try again', async () => {
    failures.archiveInsert = true
    const failed = await post({ order: ORDER, email: EMAIL })
    expect(failed.status).toBe(500)
    expect(db.archives).toHaveLength(0)
    expect(db.dependency_reports[0]).toMatchObject({ status: 'ordered', archive_id: null })

    failures.archiveInsert = false
    const retry = await post({ order: ORDER, email: EMAIL })
    expect(await retry.json()).toEqual({ ok: true })
    expect(db.archives).toHaveLength(1)
  })

  it('leaves no unlinked record behind when the link fails', async () => {
    failures.link = true
    const res = await post({ order: ORDER, email: EMAIL })
    expect(res.status).toBe(500)
    expect(db.archives).toHaveLength(0)
    expect(db.dependency_reports[0]).toMatchObject({ status: 'ordered', archive_id: null })
  })

  it('creates nothing for a report that is past ordered; the page just sends the link again', async () => {
    for (const status of ['capturing', 'ready', 'released', 'not_released', 'not_completed']) {
      db.dependency_reports[0].status = status
      const res = await post({ order: ORDER, email: EMAIL })
      expect(await res.json(), status).toEqual({ ok: true, existing: true })
      expect(db.archives, status).toHaveLength(0)
    }
  })
})
