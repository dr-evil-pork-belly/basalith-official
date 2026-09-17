import { describe, it, expect, vi, beforeEach } from 'vitest'

// Drives the real function body against a recorded supabaseAdmin.auth.admin,
// the same way lib/auth/getSessionUser.test.ts mocks the module. Nothing here
// reaches Supabase; the three admin calls the function makes are the whole
// surface, and each test reads back what was called with what.

const H = vi.hoisted(() => ({
  createUser:     vi.fn(),
  listUsers:      vi.fn(),
  updateUserById: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser:     (...a: unknown[]) => H.createUser(...a),
        listUsers:      (...a: unknown[]) => H.listUsers(...a),
        updateUserById: (...a: unknown[]) => H.updateUserById(...a),
      },
    },
  },
}))

import { getOrCreateAuthUser } from './getOrCreateAuthUser'

const EXISTS = { data: { user: null }, error: { message: 'User already registered' } }

function existing(role: string | undefined) {
  return {
    data: { users: [{ id: 'u-existing', email: 'person@example.com', app_metadata: role ? { role, extra: 'kept' } : { extra: 'kept' } }] },
    error: null,
  }
}

beforeEach(() => {
  H.createUser.mockReset()
  H.listUsers.mockReset()
  H.updateUserById.mockReset()
  H.updateUserById.mockResolvedValue({ data: {}, error: null })
})

describe('getOrCreateAuthUser, default path (no options)', () => {
  it('creates a new user with email_confirm and the role, and never lists or updates', async () => {
    H.createUser.mockResolvedValue({ data: { user: { id: 'u-new' } }, error: null })
    const id = await getOrCreateAuthUser(' Person@Example.com ', 'owner')
    expect(id).toBe('u-new')
    expect(H.createUser).toHaveBeenCalledWith({ email: 'person@example.com', email_confirm: true, app_metadata: { role: 'owner' } })
    expect(H.listUsers).not.toHaveBeenCalled()
    expect(H.updateUserById).not.toHaveBeenCalled()
  })

  it('does not call update when the existing user already has a role', async () => {
    H.createUser.mockResolvedValue(EXISTS)
    H.listUsers.mockResolvedValue(existing('contributor'))
    const id = await getOrCreateAuthUser('person@example.com', 'owner')
    expect(id).toBe('u-existing')
    expect(H.updateUserById).not.toHaveBeenCalled()
  })

  it('back-fills the role when the existing user has none', async () => {
    H.createUser.mockResolvedValue(EXISTS)
    H.listUsers.mockResolvedValue(existing(undefined))
    await getOrCreateAuthUser('person@example.com', 'owner')
    expect(H.updateUserById).toHaveBeenCalledWith('u-existing', { app_metadata: { extra: 'kept', role: 'owner' } })
  })
})

describe('getOrCreateAuthUser, forceRole', () => {
  it('overwrites an existing role and keeps the rest of app_metadata', async () => {
    H.createUser.mockResolvedValue(EXISTS)
    H.listUsers.mockResolvedValue(existing('contributor'))
    const id = await getOrCreateAuthUser('person@example.com', 'owner', { forceRole: true })
    expect(id).toBe('u-existing')
    expect(H.updateUserById).toHaveBeenCalledTimes(1)
    expect(H.updateUserById).toHaveBeenCalledWith('u-existing', { app_metadata: { extra: 'kept', role: 'owner' } })
  })

  it('is a no-op on a brand new user, which is created with the role already', async () => {
    H.createUser.mockResolvedValue({ data: { user: { id: 'u-new' } }, error: null })
    await getOrCreateAuthUser('person@example.com', 'owner', { forceRole: true })
    expect(H.updateUserById).not.toHaveBeenCalled()
  })
})
