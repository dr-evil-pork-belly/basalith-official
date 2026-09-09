/**
 * getSessionUser — Bearer token path (iOS app), added 2026-09-08.
 *
 * The web path (Supabase Auth cookie via @supabase/ssr) is unchanged and is
 * pinned here as the fallback. What is under test:
 *
 *   1. A valid `Authorization: Bearer <jwt>` resolves the user without a cookie.
 *   2. A rejected token (expired, forged) is NOT trusted and falls back to the
 *      cookie path, which in these tests has no user -> null.
 *   3. A non-JWT bearer value (the contributor access_token shape) never
 *      reaches Supabase Auth, so entity-chat's contributor branch still owns it.
 *   4. `x-archive-id` selects among OWNED archives only. A foreign id is ignored.
 *   5. With a single owned archive, the header is irrelevant.
 *   6. The cookie selection still works when no header is present.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const H = vi.hoisted(() => ({
  headerMap:  new Map<string, string>(),
  cookieMap:  new Map<string, string>(),
  cookieUser: null as null | { id: string; email: string; app_metadata: Record<string, unknown> },
  adminGetUser: vi.fn(),
  owned: [] as Array<{ id: string }>,
}))

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => H.headerMap.get(k.toLowerCase()) ?? null }),
  cookies: async () => ({ get: (k: string) => (H.cookieMap.has(k) ? { value: H.cookieMap.get(k) } : undefined) }),
}))

vi.mock('@/lib/supabase-server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: H.cookieUser } }) },
  }),
}))

vi.mock('@/lib/supabase-admin', () => {
  function table(name: string) {
    const chain: Record<string, unknown> = {}
    const finish = () => {
      if (name === 'archives')   return Promise.resolve({ data: H.owned, error: null })
      return Promise.resolve({ data: null, error: null })
    }
    chain.select      = () => chain
    chain.eq          = () => chain
    chain.maybeSingle = () => finish()
    chain.then        = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => finish().then(res, rej)
    return chain
  }
  return {
    supabaseAdmin: {
      from: (name: string) => table(name),
      auth: { getUser: (...args: unknown[]) => H.adminGetUser(...args) },
    },
  }
})

import { getSessionUser } from './getSessionUser'

// A syntactically JWT-shaped string. Never verified locally; the mocked
// supabaseAdmin.auth.getUser decides whether it is accepted.
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1LTEifQ.c2ln'
const CONTRIB_TOKEN = 'a'.repeat(64)

beforeEach(() => {
  H.headerMap.clear()
  H.cookieMap.clear()
  H.cookieUser = null
  H.owned = [{ id: 'arch-1' }]
  H.adminGetUser.mockReset()
  H.adminGetUser.mockResolvedValue({
    data:  { user: { id: 'u-1', email: 'owner@example.com', app_metadata: { role: 'owner' } } },
    error: null,
  })
})

describe('getSessionUser: Bearer path', () => {
  it('resolves a user from a valid Bearer token with no cookie present', async () => {
    H.headerMap.set('authorization', `Bearer ${JWT}`)
    const s = await getSessionUser()
    expect(H.adminGetUser).toHaveBeenCalledWith(JWT)
    expect(s?.userId).toBe('u-1')
    expect(s?.email).toBe('owner@example.com')
    expect(s?.role).toBe('owner')
    expect(s?.archiveId).toBe('arch-1')
  })

  it('does not trust a token Supabase Auth rejects', async () => {
    H.headerMap.set('authorization', `Bearer ${JWT}`)
    H.adminGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } })
    const s = await getSessionUser()
    expect(s).toBeNull()
  })

  it('ignores a non-JWT bearer value (contributor access_token shape)', async () => {
    H.headerMap.set('authorization', `Bearer ${CONTRIB_TOKEN}`)
    const s = await getSessionUser()
    expect(H.adminGetUser).not.toHaveBeenCalled()
    expect(s).toBeNull()
  })

  it('is case-insensitive on the Bearer scheme', async () => {
    H.headerMap.set('authorization', `bearer ${JWT}`)
    const s = await getSessionUser()
    expect(s?.userId).toBe('u-1')
  })
})

describe('getSessionUser: archive selection', () => {
  it('honours x-archive-id when it names an owned archive', async () => {
    H.owned = [{ id: 'arch-1' }, { id: 'arch-2' }]
    H.headerMap.set('authorization', `Bearer ${JWT}`)
    H.headerMap.set('x-archive-id', 'arch-2')
    const s = await getSessionUser()
    expect(s?.archiveId).toBe('arch-2')
  })

  it('ignores x-archive-id naming a foreign archive', async () => {
    H.owned = [{ id: 'arch-1' }, { id: 'arch-2' }]
    H.headerMap.set('authorization', `Bearer ${JWT}`)
    H.headerMap.set('x-archive-id', 'arch-9999-someone-else')
    const s = await getSessionUser()
    expect(s?.archiveId).toBe('arch-1')
  })

  it('does not consult the header when only one archive is owned', async () => {
    H.headerMap.set('authorization', `Bearer ${JWT}`)
    H.headerMap.set('x-archive-id', 'arch-9999-someone-else')
    const s = await getSessionUser()
    expect(s?.archiveId).toBe('arch-1')
  })

  it('still honours the archive-id cookie on the web path', async () => {
    H.owned = [{ id: 'arch-1' }, { id: 'arch-2' }]
    H.cookieUser = { id: 'u-1', email: 'owner@example.com', app_metadata: { role: 'owner' } }
    H.cookieMap.set('archive-id', 'arch-2')
    const s = await getSessionUser()
    expect(H.adminGetUser).not.toHaveBeenCalled()
    expect(s?.archiveId).toBe('arch-2')
  })
})
