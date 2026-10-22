import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Behavioral test of GET and POST /api/archive/checkout and of
// POST /api/archive/checkout/confirm. The identity boundary, the database,
// Stripe, the price table, and the internal notice are stood in. What is under
// test is who may open Checkout, what the session carries, and what the
// fallback will and will not found.

type Row = Record<string, unknown>

const S = vi.hoisted(() => ({
  session: null as null | { userId: string; archiveId: string | null },
  archives: [] as Record<string, unknown>[],
  applications: [] as Record<string, unknown>[],
  created: [] as Record<string, unknown>[],
  retrieved: {} as Record<string, unknown>,
  notices: [] as string[],
  missingPrices: new Set<string>(),
  stripeMode: 'test' as 'test' | 'live',
  createFails: false,
}))

function query(name: string) {
  const table: Row[] =
    name === 'archives' ? S.archives :
    name === 'archive_applications' ? S.applications :
    (() => { throw new Error(`unexpected table ${name}`) })()
  const filters: ((r: Row) => boolean)[] = []
  let patch: Row | null = null
  const run = () => {
    const hit = table.filter(r => filters.every(f => f(r)))
    if (patch) { hit.forEach(r => Object.assign(r, patch)); return { data: hit.map(r => ({ id: r.id })), error: null } }
    return { data: hit, error: null }
  }
  const q = {
    select() { return q },
    update(p: Row) { patch = p; return q },
    eq(col: string, val: unknown) { filters.push(r => r[col] === val); return q },
    limit() { return q },
    async maybeSingle() { const out = run(); return { data: out.data[0] ?? null, error: out.error } },
    then(resolve: (v: ReturnType<typeof run>) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve().then(run).then(resolve, reject)
    },
  }
  return q
}

vi.mock('@/lib/auth/getSessionUser', () => ({ getSessionUser: async () => S.session }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (name: string) => query(name) } }))
vi.mock('@/lib/internalNotify', () => ({ notifyInternal: async (n: { subject: string }) => { S.notices.push(n.subject) } }))
vi.mock('@/lib/stripe/prices', () => ({
  priceId: (name: string) => {
    if (S.missingPrices.has(name)) throw new Error(`No test Stripe price id for '${name}'.`)
    return `price_${name}`
  },
}))
vi.mock('@/lib/stripe/client', () => ({
  stripeMode: () => S.stripeMode,
  getStripe: () => ({
    checkout: {
      sessions: {
        create: async (params: Record<string, unknown>) => {
          if (S.createFails) throw new Error('stripe is down')
          S.created.push(params)
          return { id: 'cs_test_created', url: 'https://checkout.stripe.com/c/pay/cs_test_created' }
        },
        retrieve: async (id: string) => {
          const hit = S.retrieved[id]
          if (!hit) throw new Error(`No such checkout.session: ${id}`)
          return hit
        },
      },
    },
  }),
}))
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return { ...actual, after: (fn: () => unknown) => { void fn() } }
})

import { GET, POST } from './route'
import { POST as CONFIRM } from './confirm/route'

const OWNER  = 'user-owner'
const RECORD = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const EMAIL  = 'margaret@example.com'
const REFERRER = '11111111-2222-4333-8444-555555555555'
const PAID_SESSION = 'cs_test_a1B2c3D4e5F6g7H8'
let ipSeq = 0

function request(url: string, body: unknown) {
  return new Request(url, {
    method:  'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${++ipSeq}` },
    body:    JSON.stringify(body),
  }) as never
}
const pay     = (body: unknown = { billingPeriod: 'year' }) => POST(request('https://basalith.ai/api/archive/checkout', body))
const confirm = (body: unknown = { sessionId: PAID_SESSION }) => CONFIRM(request('https://basalith.ai/api/archive/checkout/confirm', body))
const flush   = () => new Promise(r => setTimeout(r, 0))

const ENV_KEYS = ['TRIAL_CHECKOUT', 'VERCEL_ENV', 'STRIPE_TAX_ENABLED', 'NEXT_PUBLIC_SITE_URL'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k]
  process.env.TRIAL_CHECKOUT = 'on'
  process.env.VERCEL_ENV = 'preview'
  delete process.env.STRIPE_TAX_ENABLED
  delete process.env.NEXT_PUBLIC_SITE_URL

  S.session = { userId: OWNER, archiveId: RECORD }
  S.archives.length = 0
  S.archives.push({
    id: RECORD, owner_user_id: OWNER, owner_email: EMAIL, owner_name: 'Margaret Chen', name: 'Chen Basalith',
    tier: 'active', status: 'trial', scheduled_deletion_at: null, termination_requested_at: null,
    trial_expires_at: '2026-10-20T00:00:00Z', converted_at: null,
  })
  S.applications.length = 0
  S.applications.push({ id: 'app-1', email: EMAIL, status: 'trial', reason: 'trial' })
  S.created.length = 0
  S.notices.length = 0
  S.missingPrices.clear()
  S.stripeMode = 'test'
  S.createFails = false
  S.retrieved = {
    [PAID_SESSION]: { id: PAID_SESSION, payment_status: 'paid', subscription: 'sub_1', metadata: { archive_id: RECORD, source: 'trial' } },
  }
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('POST /api/archive/checkout', () => {
  it('no session is 401 and a session that does not own the record is 403', async () => {
    S.session = null
    expect((await pay()).status).toBe(401)
    S.session = { userId: 'someone-else', archiveId: RECORD }
    expect((await pay()).status).toBe(403)
    expect(S.created).toHaveLength(0)
  })

  it('opens a subscription session for the owner\'s own trial, with the plan and the founding line', async () => {
    const res = await pay()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_created' })
    const p = S.created[0]
    expect(p.mode).toBe('subscription')
    expect(p.line_items).toEqual([{ price: 'price_b2c_active_year', quantity: 1 }, { price: 'price_b2c_founding', quantity: 1 }])
    expect(p.customer_email).toBe(EMAIL)
    expect(p.client_reference_id).toBe(RECORD)
    expect(p.automatic_tax).toEqual({ enabled: false })
  })

  it('writes archive_id and source trial on the session AND the subscription, never the legacy key', async () => {
    await pay({ billingPeriod: 'month' })
    const p = S.created[0] as { metadata: Record<string, string>; subscription_data: { metadata: Record<string, string> }; line_items: { price: string }[] }
    const want = { archive_id: RECORD, source: 'trial', segment: 'b2c', tier: 'b2c_active', billing_period: 'month', application_id: 'app-1' }
    expect(p.metadata).toEqual(want)
    expect(p.subscription_data.metadata).toEqual(want)
    expect(p.metadata).not.toHaveProperty('archiveId')
    expect(p.line_items[0].price).toBe('price_b2c_active_month')
  })

  it('returns the payer to /archive/founded with the session id, and a cancel to the founding page', async () => {
    await pay()
    expect(S.created[0].success_url).toBe('https://basalith.ai/archive/founded?session_id={CHECKOUT_SESSION_ID}')
    expect(S.created[0].cancel_url).toBe('https://basalith.ai/archive/founding')
  })

  it('charges the half founding fee when a referral is recorded on the trial, and carries the referrer', async () => {
    S.applications[0].reason = `trial [referred by owner archive ${REFERRER}]`
    await pay()
    const p = S.created[0] as { metadata: Record<string, string>; line_items: { price: string }[] }
    expect(p.line_items[1].price).toBe('price_b2c_founding_referral')
    expect(p.metadata.founding_referral).toBe('half')
    expect(p.metadata.referrer_archive_id).toBe(REFERRER)
  })

  it('a referral tag naming this same record is no referral', async () => {
    S.applications[0].reason = `trial [referred by owner archive ${RECORD}]`
    await pay()
    const p = S.created[0] as { metadata: Record<string, string>; line_items: { price: string }[] }
    expect(p.line_items[1].price).toBe('price_b2c_founding')
    expect(p.metadata).not.toHaveProperty('referrer_archive_id')
  })

  it('a trial with no lead row still pays, at the list fee, with no application id', async () => {
    S.applications.length = 0
    const res = await pay()
    expect(res.status).toBe(200)
    expect((S.created[0] as { metadata: Record<string, string> }).metadata).not.toHaveProperty('application_id')
  })

  it('refuses a founded record, a business trial, and a record set for deletion, and calls Stripe for none', async () => {
    for (const patch of [
      { status: 'active' }, { status: 'assessment', tier: 'succession' }, { status: 'paused' },
      { tier: 'succession' }, { scheduled_deletion_at: '2027-01-01T00:00:00Z' }, { termination_requested_at: '2026-10-09T00:00:00Z' },
    ]) {
      S.archives[0] = { ...S.archives[0], status: 'trial', tier: 'active', scheduled_deletion_at: null, termination_requested_at: null, ...patch }
      expect((await pay()).status, JSON.stringify(patch)).toBe(409)
    }
    expect(S.created).toHaveLength(0)
  })

  it('is closed when TRIAL_CHECKOUT is unset, and open to a listed owner only', async () => {
    delete process.env.TRIAL_CHECKOUT
    expect((await pay()).status).toBe(503)
    process.env.TRIAL_CHECKOUT = 'someone@else.com'
    expect((await pay()).status).toBe(503)
    process.env.TRIAL_CHECKOUT = `someone@else.com, ${EMAIL}`
    expect((await pay()).status).toBe(200)
  })

  it('"on" with a test key on production is closed: a hand made request cannot open it either', async () => {
    process.env.VERCEL_ENV = 'production'
    expect((await pay()).status).toBe(503)
    S.stripeMode = 'live'
    expect((await pay()).status).toBe(200)
  })

  it('rejects a body with no valid billing period', async () => {
    for (const body of [{}, { billingPeriod: 'annual' }, null, { billingPeriod: 12 }]) {
      expect((await pay(body)).status).toBe(400)
    }
    expect(S.created).toHaveLength(0)
  })

  it('a missing Stripe price is a 503 and the founder is told', async () => {
    S.missingPrices.add('b2c_founding')
    expect((await pay()).status).toBe(503)
    await flush()
    expect(S.notices).toContain('Checkout refused: a Stripe price is missing')
    expect(S.created).toHaveLength(0)
  })

  it('a Stripe failure is a 500 that says nothing about Stripe', async () => {
    S.createFails = true
    const res = await pay()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toMatch(/stripe is down/)
  })

  it('tells the founder a Checkout was opened, and changes nothing on the record', async () => {
    await pay()
    await flush()
    expect(S.notices).toEqual(['Checkout opened: Chen Basalith'])
    expect(S.archives[0]).toMatchObject({ status: 'trial', converted_at: null })
  })

  it('turns tax on only when STRIPE_TAX_ENABLED is exactly true', async () => {
    process.env.STRIPE_TAX_ENABLED = 'true'
    await pay()
    expect(S.created[0].automatic_tax).toEqual({ enabled: true })
  })
})

describe('GET /api/archive/checkout', () => {
  it('reports the caller\'s own status and nothing else', async () => {
    expect(await (await GET()).json()).toEqual({ status: 'trial', founded: false })
    S.archives[0].status = 'active'
    expect(await (await GET()).json()).toEqual({ status: 'active', founded: true })
  })

  it('no session is 401, another owner is 403', async () => {
    S.session = null
    expect((await GET()).status).toBe(401)
    S.session = { userId: 'someone-else', archiveId: RECORD }
    expect((await GET()).status).toBe(403)
  })
})

describe('POST /api/archive/checkout/confirm, the fallback', () => {
  it('founds the record when Stripe says this owner\'s session is paid, and tells the founder', async () => {
    const res = await confirm()
    expect(await res.json()).toEqual({ founded: true })
    expect(S.archives[0]).toMatchObject({ status: 'active', trial_expires_at: null })
    expect(S.archives[0].converted_at).toBeTruthy()
    await flush()
    expect(S.notices).toEqual(['FOUNDED BY THE FALLBACK: the Stripe webhook did not land in a minute'])
  })

  it('does nothing for a session that is not paid', async () => {
    (S.retrieved[PAID_SESSION] as Row).payment_status = 'unpaid'
    expect(await (await confirm()).json()).toEqual({ founded: false })
    expect(S.archives[0].status).toBe('trial')
    await flush()
    expect(S.notices).toHaveLength(0)
  })

  it('does nothing for a paid session that names another record, or that is not a trial session', async () => {
    (S.retrieved[PAID_SESSION] as { metadata: Row }).metadata = { archive_id: 'some-other-record', source: 'trial' }
    expect(await (await confirm()).json()).toEqual({ founded: false })
    ;(S.retrieved[PAID_SESSION] as { metadata: Row }).metadata = { archive_id: RECORD }
    expect(await (await confirm()).json()).toEqual({ founded: false })
    expect(S.archives[0].status).toBe('trial')
  })

  it('an already founded record answers founded without asking Stripe or sending a notice', async () => {
    S.archives[0].status = 'active'
    S.retrieved = {}
    expect(await (await confirm()).json()).toEqual({ founded: true })
    await flush()
    expect(S.notices).toHaveLength(0)
  })

  it('a session id Stripe does not know changes nothing', async () => {
    const res = await confirm({ sessionId: 'cs_test_unknownunknown' })
    expect(res.status).toBe(502)
    expect(S.archives[0].status).toBe('trial')
  })

  it('rejects a malformed session id, no session, and another owner', async () => {
    expect((await confirm({ sessionId: 'not-a-session' })).status).toBe(400)
    expect((await confirm({})).status).toBe(400)
    S.session = null
    expect((await confirm()).status).toBe(401)
    S.session = { userId: 'someone-else', archiveId: RECORD }
    expect((await confirm()).status).toBe(403)
    expect(S.archives[0].status).toBe('trial')
  })
})
