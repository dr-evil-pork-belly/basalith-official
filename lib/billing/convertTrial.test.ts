import { describe, it, expect } from 'vitest'
import {
  convertTrialOnPayment,
  markTrialFounded,
  type ConvertArchiveRow,
  type ConvertDeps,
  type ConvertProgress,
  type FlipResult,
} from './convertTrial'

// ── markTrialFounded against a small in memory archives table ────────────────
// The stand in implements only the two calls the function makes. Anything else
// throws, so a new query fails here instead of passing unseen.

type Row = Record<string, unknown>

function fakeDb(rows: Row[], fail: { update?: boolean; read?: boolean } = {}) {
  const calls: string[] = []
  const from = (name: string) => {
    if (name !== 'archives') throw new Error(`unexpected table ${name}`)
    const filters: ((r: Row) => boolean)[] = []
    let patch: Row | null = null
    const run = () => {
      const hit = rows.filter(r => filters.every(f => f(r)))
      if (patch) {
        calls.push('update')
        if (fail.update) return { data: null, error: { message: 'update refused' } }
        hit.forEach(r => Object.assign(r, patch))
        return { data: hit.map(r => ({ id: r.id })), error: null }
      }
      calls.push('read')
      if (fail.read) return { data: null, error: { message: 'read refused' } }
      return { data: hit, error: null }
    }
    const q = {
      update(p: Row) { patch = p; return q },
      select() { return q },
      eq(col: string, val: unknown) { filters.push(r => r[col] === val); return q },
      async maybeSingle() { const out = run(); return { data: (out.data as Row[] | null)?.[0] ?? null, error: out.error } },
      then(resolve: (v: ReturnType<typeof run>) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve().then(run).then(resolve, reject)
      },
    }
    return q
  }
  return { db: { from } as never, calls }
}

const NOW = new Date('2026-10-09T17:00:00.000Z')

describe('markTrialFounded', () => {
  it('moves a trial to active, stamps converted_at, and clears the expiry', async () => {
    const rows = [{ id: 'a1', status: 'trial', trial_expires_at: '2026-10-20T00:00:00Z', converted_at: null }]
    const { db } = fakeDb(rows)
    expect(await markTrialFounded(db, 'a1', NOW)).toBe('founded')
    expect(rows[0]).toMatchObject({ status: 'active', converted_at: NOW.toISOString(), trial_expires_at: null })
  })

  it('a second call changes nothing and says the record was already active', async () => {
    const rows = [{ id: 'a1', status: 'trial', trial_expires_at: 'x', converted_at: null }]
    const { db } = fakeDb(rows)
    await markTrialFounded(db, 'a1', NOW)
    const later = new Date('2026-10-10T00:00:00.000Z')
    expect(await markTrialFounded(db, 'a1', later)).toBe('already_active')
    expect(rows[0].converted_at).toBe(NOW.toISOString())
  })

  it('never touches a record that is not a trial', async () => {
    for (const status of ['paused', 'assessment', 'drill']) {
      const rows = [{ id: 'a1', status, trial_expires_at: null, converted_at: null }]
      const { db } = fakeDb(rows)
      expect(await markTrialFounded(db, 'a1', NOW)).toEqual({ unexpected: status })
      expect(rows[0]).toMatchObject({ status, converted_at: null })
    }
  })

  it('touches only the record it was given', async () => {
    const rows = [
      { id: 'a1', status: 'trial', converted_at: null },
      { id: 'a2', status: 'trial', converted_at: null },
    ]
    const { db } = fakeDb(rows)
    await markTrialFounded(db, 'a1', NOW)
    expect(rows[1]).toMatchObject({ status: 'trial', converted_at: null })
  })

  it('reports a record that does not exist, and throws on a failed write so the caller is retried', async () => {
    expect(await markTrialFounded(fakeDb([]).db, 'gone', NOW)).toBe('missing')
    await expect(markTrialFounded(fakeDb([{ id: 'a1', status: 'trial' }], { update: true }).db, 'a1', NOW)).rejects.toThrow(/update refused/)
  })
})

// ── convertTrialOnPayment with every dependency recorded ─────────────────────

const ARCHIVE: ConvertArchiveRow = {
  id: 'a1', status: 'trial', tier: 'active', name: 'Chen Basalith',
  family_name: 'Chen', owner_email: 'margaret@example.com', owner_name: 'Margaret Chen',
}
const PROGRESS: ConvertProgress = { deposits: 12, callsCompleted: 1, nextCall: 2 }

function harness(over: {
  archive?: ConvertArchiveRow | null
  flip?: FlipResult
  others?: string[]
} = {}) {
  const log: string[] = []
  const notices: { subject: string; text: string }[] = []
  const steps: string[] = []
  const deps: ConvertDeps = {
    step: async (id, fn) => { steps.push(id); return fn() },
    loadArchive: async () => (over.archive === undefined ? ARCHIVE : over.archive),
    flip: async () => { log.push('flip'); return over.flip ?? 'founded' },
    otherPaidSubscriptions: async () => over.others ?? [],
    linkBilling: async (sub, id) => { log.push(`link:${sub}:${id}`) },
    upsertLifecycle: async (id) => { log.push(`lifecycle:${id}`) },
    loadProgress: async () => PROGRESS,
    sendWelcome: async (a, p) => { log.push(`welcome:${a.owner_email}:${p.deposits}`) },
    notify: async (n) => { notices.push(n) },
  }
  const run = () => convertTrialOnPayment({ archiveId: 'a1', subscriptionId: 'sub_1', referred: false, billingPeriod: 'year' }, deps)
  return { run, log, notices, steps }
}

describe('convertTrialOnPayment', () => {
  it('founds the record, links billing, writes the lifecycle row, welcomes, and tells the founder', async () => {
    const h = harness()
    const out = await h.run()
    expect(out).toEqual({ ok: true, archiveId: 'a1', familyName: 'Chen', flip: 'founded', duplicate: false })
    expect(h.log).toEqual(['flip', 'link:sub_1:a1', 'lifecycle:a1', 'welcome:margaret@example.com:12'])
    expect(h.notices.map(n => n.subject)).toEqual(['Founded: Chen Basalith'])
    expect(h.notices[0].text).toContain('12 deposits, 1 of 3 founding calls')
    expect(h.notices[0].text).toContain('Plan: yearly')
  })

  it('carries on when the webhook already flipped the record: that is the normal order', async () => {
    const h = harness({ flip: 'already_active' })
    const out = await h.run()
    expect(out).toMatchObject({ ok: true, flip: 'already_active', duplicate: false })
    expect(h.log).toContain('link:sub_1:a1')
    expect(h.log).toContain('welcome:margaret@example.com:12')
    expect(h.notices[0].text).toContain('Founded by the webhook.')
  })

  it('a record already paid on another subscription is linked, flagged, and not welcomed twice', async () => {
    const h = harness({ flip: 'already_active', others: ['sub_0'] })
    const out = await h.run()
    expect(out).toMatchObject({ ok: true, duplicate: true })
    expect(h.log).toEqual(['flip', 'link:sub_1:a1', 'lifecycle:a1'])
    expect(h.notices.map(n => n.subject)).toEqual(['PAID TWICE: Chen Basalith'])
    expect(h.notices[0].text).toContain('sub_0')
  })

  it('a payment naming a record that does not exist creates nothing and tells the founder', async () => {
    const h = harness({ archive: null })
    const out = await h.run()
    expect(out).toEqual({ ok: false, reason: 'record_missing', detail: 'a1' })
    expect(h.log).toEqual([])
    expect(h.notices[0].subject).toMatch(/^PAID, NO RECORD/)
  })

  it('a record in any other state is not changed, is linked, and the founder is told', async () => {
    const h = harness({ flip: { unexpected: 'paused' } })
    const out = await h.run()
    expect(out).toEqual({ ok: false, reason: 'unexpected_status', detail: 'status paused' })
    expect(h.log).toEqual(['flip', 'link:sub_1:a1'])
    expect(h.notices[0].subject).toMatch(/^PAID, NOT FOUNDED/)
  })

  it('a record deleted between the read and the write is not linked: billing.archive_id is a foreign key', async () => {
    const h = harness({ flip: 'missing' })
    const out = await h.run()
    expect(out).toMatchObject({ ok: false, reason: 'unexpected_status' })
    expect(h.log).toEqual(['flip'])
  })

  it('every step id is its own, so an Inngest replay can never hand one step another step\'s result', async () => {
    for (const over of [{}, { flip: 'already_active' as const, others: ['sub_0'] }, { flip: { unexpected: 'paused' } }, { archive: null }]) {
      const h = harness(over)
      await h.run()
      expect(new Set(h.steps).size, JSON.stringify(over)).toBe(h.steps.length)
      for (const id of h.steps) expect(id).toMatch(/^convert:/)
    }
  })

  it('has no way to create a record', async () => {
    // The dependency list is the whole of what this body can do.
    const h = harness()
    await h.run()
    expect(h.log.some(l => /create|insert/.test(l))).toBe(false)
  })
})
