import { describe, it, expect, vi } from 'vitest'
import { PURGE_BUCKETS, purgeArchiveStorage, requireTerminated } from './storagePurge'
import { ALLOWLIST } from './storageBackup'

// The lib takes its client as a dependency, so this is a recorded client
// handed in, not a module mock: the same idea as lib/auth/getSessionUser.test.ts
// with no vi.mock needed. Nothing reaches Supabase.

const ID = 'aaaaaaaa-0000-4000-8000-000000000001'

type Row = { id: string; name: string | null; termination_requested_at: string | null; scheduled_deletion_at: string | null } | null

function client(row: Row, listings: Record<string, string[]> = {}, opts: { stuck?: boolean } = {}) {
  const removed: Record<string, string[]> = {}
  const listed: Record<string, number> = {}
  const from = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: table === 'archives' ? row : null, error: null }),
      }),
    }),
  })
  const storage = {
    from: (bucket: string) => ({
      list: async (prefix: string) => {
        listed[bucket] = (listed[bucket] ?? 0) + 1
        // First listing returns the fixture; after a remove, the prefix is empty.
        const names = removed[bucket] && !opts.stuck ? [] : (listings[bucket] ?? [])
        return { data: names.map((n) => ({ name: n, id: 'obj' })), error: null }
      },
      remove: async (paths: string[]) => {
        removed[bucket] = [...(removed[bucket] ?? []), ...paths]
        return { data: null, error: null }
      },
    }),
  }
  return { supabaseAdmin: { from, storage } as never, removed, listed }
}

describe('purgeArchiveStorage', () => {
  it('walks the four allowlist buckets plus archive-exports, in that order', () => {
    expect([...PURGE_BUCKETS]).toEqual([...ALLOWLIST, 'archive-exports'])
  })

  it('refuses when termination_requested_at is null and touches no bucket', async () => {
    const c = client({ id: ID, name: 'Live Family', termination_requested_at: null, scheduled_deletion_at: null })
    await expect(purgeArchiveStorage(ID, { supabaseAdmin: c.supabaseAdmin, log: () => {} }))
      .rejects.toThrow(/no termination_requested_at/)
    expect(Object.keys(c.listed)).toEqual([])
    expect(Object.keys(c.removed)).toEqual([])
  })

  it('refuses when there is no archives row', async () => {
    const c = client(null)
    await expect(requireTerminated(c.supabaseAdmin, ID)).rejects.toThrow(/no archives row/)
  })

  it('refuses a non-uuid before reading anything', async () => {
    const c = client({ id: ID, name: 'x', termination_requested_at: '2026-09-17T00:00:00Z', scheduled_deletion_at: null })
    await expect(purgeArchiveStorage('nonsense', { supabaseAdmin: c.supabaseAdmin, log: () => {} })).rejects.toThrow(/not a uuid/)
  })

  it('deletes only under the archive prefix and verifies each bucket empty', async () => {
    const c = client(
      { id: ID, name: 'Drill', termination_requested_at: '2026-09-17T00:00:00Z', scheduled_deletion_at: null },
      { photographs: ['one.jpeg', 'two.jpeg'], 'voice-recordings': ['1.webm'] },
    )
    const r = await purgeArchiveStorage(ID, { supabaseAdmin: c.supabaseAdmin, log: () => {} })
    expect(r.total).toBe(3)
    expect(r.buckets.map((b) => [b.bucket, b.found, b.deleted, b.verifiedEmpty])).toEqual([
      ['photographs', 2, 2, true],
      ['voice-recordings', 1, 1, true],
      ['archive-videos', 0, 0, null],
      ['archive-documents', 0, 0, null],
      ['archive-exports', 0, 0, null],
    ])
    expect(c.removed.photographs).toEqual([`${ID}/one.jpeg`, `${ID}/two.jpeg`])
    expect(c.removed['voice-recordings']).toEqual([`${ID}/1.webm`])
  })

  it('a dry run lists and removes nothing', async () => {
    const c = client(
      { id: ID, name: 'Drill', termination_requested_at: '2026-09-17T00:00:00Z', scheduled_deletion_at: null },
      { photographs: ['one.jpeg'] },
    )
    const r = await purgeArchiveStorage(ID, { supabaseAdmin: c.supabaseAdmin, dryRun: true, log: () => {} })
    expect(r.dryRun).toBe(true)
    expect(r.total).toBe(1)
    expect(r.buckets[0]).toMatchObject({ bucket: 'photographs', found: 1, deleted: 0, verifiedEmpty: null })
    expect(Object.keys(c.removed)).toEqual([])
  })

  it('throws if an object survives the delete', async () => {
    // A remove that reports success but leaves the object listed.
    const c = client(
      { id: ID, name: 'Drill', termination_requested_at: '2026-09-17T00:00:00Z', scheduled_deletion_at: null },
      { photographs: ['stuck.jpeg'] },
      { stuck: true },
    )
    await expect(purgeArchiveStorage(ID, { supabaseAdmin: c.supabaseAdmin, log: () => {} })).rejects.toThrow(/survived deletion/)
  })

  it('logs through the injected logger, so the job can capture it', async () => {
    const lines: string[] = []
    const c = client({ id: ID, name: 'Drill', termination_requested_at: '2026-09-17T00:00:00Z', scheduled_deletion_at: null })
    await purgeArchiveStorage(ID, { supabaseAdmin: c.supabaseAdmin, dryRun: true, log: (l) => lines.push(l) })
    expect(lines[0]).toContain('archive:')
    expect(lines.at(-1)).toContain('WOULD DELETE 0')
    expect(vi.isMockFunction(console.log)).toBe(false)
  })
})
