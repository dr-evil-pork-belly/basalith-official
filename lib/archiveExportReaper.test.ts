/**
 * Export reaper gate.
 *
 * This is the only delete path on the property that runs unattended, and every
 * object it can reach is a complete unencrypted copy of one family's entire
 * archive. Two of them, 196.33 MB each, sat in Storage from August 4 to August 9
 * 2026 because the reaper was written but never committed and never once run.
 *
 * So the two failures this file exists to prevent pull in opposite directions:
 *
 *   1. Deleting something it should not. A file whose provenance this job does
 *      not understand, or an export that is still inside its retention window
 *      and still has a live link in a family's inbox.
 *
 *   2. Failing to delete something it should. A silent reaper is how a full
 *      plaintext copy of every archive ever exported accumulates in a bucket
 *      nobody looks at.
 *
 * The dry-run cases matter as much as the delete cases. Dry run is how this code
 * gets pointed at real production objects before it is trusted to remove one, so
 * "dry run deleted nothing" is a load-bearing assertion, not a nicety.
 *
 * Storage is mocked. Nothing here can reach Supabase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Node = {
  name:        string
  id:          string | null
  created_at?: string | null
  metadata?:   { size: number }
}

const H = vi.hoisted(() => {
  const state = {
    /** '' is the bucket root. Any other key is a prefix listing. */
    tree:        {} as Record<string, Node[]>,
    listErrors:  {} as Record<string, string>,
    removeError: null as string | null,
    removeCalls: [] as string[][],
    bucketsUsed: [] as string[],
  }

  const supabaseAdmin = {
    storage: {
      from: (bucket: string) => {
        state.bucketsUsed.push(bucket)
        return {
          list: async (prefix: string) => {
            if (state.listErrors[prefix]) {
              return { data: null, error: { message: state.listErrors[prefix] } }
            }
            return { data: state.tree[prefix] ?? [], error: null }
          },
          remove: async (paths: string[]) => {
            state.removeCalls.push(paths)
            if (state.removeError) return { data: null, error: { message: state.removeError } }
            return { data: paths.map((p) => ({ name: p })), error: null }
          },
        }
      },
    },
  }

  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))

import { reapExpiredExports } from '@/lib/archiveExportReaper'
import { EXPORT_BUCKET, RETENTION_DAYS, RETENTION_SECONDS } from '@/lib/archiveExportStorage'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-08-09T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const A1  = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
const A2  = '1783f9cf-19b5-486e-8c84-800f85f665c0'

/** ISO timestamp for an object created `ms` before NOW. */
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

/** A folder entry as Supabase returns it at the bucket root: id is null. */
const folder = (name: string): Node => ({ name, id: null })

/** A real object inside a prefix. */
const object = (name: string, createdAt: string | null, size = 196_000_000): Node => ({
  name,
  id: `obj-${name}`,
  created_at: createdAt,
  metadata: { size },
})

function setTree(tree: Record<string, Node[]>) {
  H.state.tree = tree
}

beforeEach(() => {
  H.state.tree        = {}
  H.state.listErrors  = {}
  H.state.removeError = null
  H.state.removeCalls = []
  H.state.bucketsUsed = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { vi.restoreAllMocks() })

// ── The retention constant itself is a gate ───────────────────────────────────

describe('retention window', () => {
  it('is 7 days, and the seconds constant agrees', () => {
    expect(RETENTION_DAYS).toBe(7)
    expect(RETENTION_SECONDS).toBe(7 * 24 * 60 * 60)
  })
})

// ── Deleting what it should ───────────────────────────────────────────────────

describe('objects past their deadline', () => {
  it('deletes an object 8 days old', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('export-old.zip', ago(8 * DAY))],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.ok).toBe(true)
    expect(r.dryRun).toBe(false)
    expect(r.scanned).toBe(1)
    expect(r.deleted).toBe(1)
    expect(r.deletedPaths).toEqual([`${A1}/export-old.zip`])
    expect(r.kept).toEqual([])
    expect(H.state.removeCalls).toEqual([[`${A1}/export-old.zip`]])
  })

  it('deletes an object created exactly on the cutoff', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('export-boundary.zip', ago(RETENTION_SECONDS * 1000))],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.deleted).toBe(1)
    expect(r.deletedPaths).toEqual([`${A1}/export-boundary.zip`])
  })

  it('deletes an object with no created_at rather than treating it as immortal', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('export-undated.zip', null)],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.deleted).toBe(1)
    expect(r.deletedPaths).toEqual([`${A1}/export-undated.zip`])
  })

  it('sweeps every archive prefix, not just the first', async () => {
    setTree({
      '':   [folder(A1), folder(A2)],
      [A1]: [object('a.zip', ago(9 * DAY))],
      [A2]: [object('b.zip', ago(10 * DAY))],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.scanned).toBe(2)
    expect(r.deleted).toBe(2)
    expect(r.deletedPaths).toEqual([`${A1}/a.zip`, `${A2}/b.zip`])
  })
})

// ── Not deleting what it should not ───────────────────────────────────────────

describe('objects inside their window', () => {
  it('keeps an object 3 days old and never calls remove', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('export-fresh.zip', ago(3 * DAY))],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.ok).toBe(true)
    expect(r.scanned).toBe(1)
    expect(r.deleted).toBe(0)
    expect(r.deletedPaths).toEqual([])
    expect(H.state.removeCalls).toEqual([])
  })

  it('keeps an object one millisecond inside the cutoff', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('export-just-inside.zip', ago(RETENTION_SECONDS * 1000 - 1))],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.deleted).toBe(0)
    expect(H.state.removeCalls).toEqual([])
  })

  it('reports a kept object with a deadline exactly RETENTION_SECONDS after creation', async () => {
    const created = ago(3 * DAY)
    setTree({
      '':   [folder(A1)],
      [A1]: [object('export-fresh.zip', created)],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.kept).toEqual([{
      path:      `${A1}/export-fresh.zip`,
      expiresAt: new Date(new Date(created).getTime() + RETENTION_SECONDS * 1000).toISOString(),
    }])
  })

  it('deletes only the overdue object in a mixed prefix', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [
        object('old.zip',   ago(8 * DAY)),
        object('fresh.zip', ago(1 * DAY)),
      ],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.scanned).toBe(2)
    expect(r.deleted).toBe(1)
    expect(r.deletedPaths).toEqual([`${A1}/old.zip`])
    expect(r.kept?.map((k) => k.path)).toEqual([`${A1}/fresh.zip`])
    expect(H.state.removeCalls).toEqual([[`${A1}/old.zip`]])
  })

  it('leaves a file sitting at the bucket root alone, however old, and warns', async () => {
    setTree({
      // id is NOT null, so this is a file at the root, not an archive folder.
      '': [object('stray-at-root.zip', ago(400 * DAY))],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.ok).toBe(true)
    expect(r.scanned).toBe(0)
    expect(r.deleted).toBe(0)
    expect(H.state.removeCalls).toEqual([])
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('unexpected object at bucket root'),
    )
  })

  it('does nothing on an empty bucket', async () => {
    setTree({ '': [] })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.ok).toBe(true)
    expect(r.scanned).toBe(0)
    expect(r.deleted).toBe(0)
    expect(H.state.removeCalls).toEqual([])
  })

  it('touches no bucket other than archive-exports', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('old.zip', ago(8 * DAY))],
    })

    await reapExpiredExports({ now: NOW })

    expect(new Set(H.state.bucketsUsed)).toEqual(new Set([EXPORT_BUCKET]))
  })
})

// ── Dry run ───────────────────────────────────────────────────────────────────

describe('dry run', () => {
  it('reports an overdue object as a candidate and deletes nothing', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('export-old.zip', ago(8 * DAY))],
    })

    const r = await reapExpiredExports({ now: NOW, dryRun: true })

    expect(r.ok).toBe(true)
    expect(r.dryRun).toBe(true)
    expect(r.scanned).toBe(1)
    expect(r.deleted).toBe(0)
    expect(r.deletedPaths).toEqual([`${A1}/export-old.zip`])
    expect(H.state.removeCalls).toEqual([])
  })

  it('never calls remove even with many candidates across many prefixes', async () => {
    setTree({
      '':   [folder(A1), folder(A2)],
      [A1]: [object('a.zip', ago(9 * DAY)), object('b.zip', null)],
      [A2]: [object('c.zip', ago(30 * DAY))],
    })

    const r = await reapExpiredExports({ now: NOW, dryRun: true })

    expect(r.deleted).toBe(0)
    expect(r.deletedPaths).toHaveLength(3)
    expect(H.state.removeCalls).toEqual([])
  })

  it('picks the same objects a real run would', async () => {
    const tree = {
      '':   [folder(A1)],
      [A1]: [object('old.zip', ago(8 * DAY)), object('fresh.zip', ago(2 * DAY))],
    }

    setTree(tree)
    const dry = await reapExpiredExports({ now: NOW, dryRun: true })

    setTree(tree)
    H.state.removeCalls = []
    const wet = await reapExpiredExports({ now: NOW })

    expect(dry.deletedPaths).toEqual(wet.deletedPaths)
    expect(dry.kept).toEqual(wet.kept)
    expect(dry.deleted).toBe(0)
    expect(wet.deleted).toBe(1)
  })

  it('defaults to a real run when no option is passed', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('old.zip', ago(8 * DAY))],
    })

    const r = await reapExpiredExports({ now: NOW })

    expect(r.dryRun).toBe(false)
    expect(H.state.removeCalls).toEqual([[`${A1}/old.zip`]])
  })
})

// ── Failure paths ─────────────────────────────────────────────────────────────

describe('failures', () => {
  it('returns not-ok and deletes nothing when the root listing fails', async () => {
    H.state.listErrors[''] = 'bucket unreachable'

    const r = await reapExpiredExports({ now: NOW })

    expect(r.ok).toBe(false)
    expect(r.error).toBe('bucket unreachable')
    expect(r.scanned).toBe(0)
    expect(r.deleted).toBe(0)
    expect(H.state.removeCalls).toEqual([])
  })

  it('skips a prefix whose listing fails and still reaps the others', async () => {
    setTree({
      '':   [folder(A1), folder(A2)],
      [A2]: [object('c.zip', ago(9 * DAY))],
    })
    H.state.listErrors[A1] = 'prefix listing failed'

    const r = await reapExpiredExports({ now: NOW })

    expect(r.ok).toBe(true)
    expect(r.scanned).toBe(1)
    expect(r.deletedPaths).toEqual([`${A2}/c.zip`])
  })

  it('reports deleted 0 when remove fails, and does not claim the objects are gone', async () => {
    setTree({
      '':   [folder(A1)],
      [A1]: [object('old.zip', ago(8 * DAY))],
    })
    H.state.removeError = 'permission denied'

    const r = await reapExpiredExports({ now: NOW })

    expect(r.ok).toBe(false)
    expect(r.error).toBe('permission denied')
    expect(r.deleted).toBe(0)
    // The paths are still reported so the alert names what is still sitting there.
    expect(r.deletedPaths).toEqual([`${A1}/old.zip`])
  })
})
