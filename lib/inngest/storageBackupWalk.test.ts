/**
 * Source walk gate. Skeleton section 2.2.
 *
 * `walkBucket` decides what the backup considers a source object. Anything it
 * returns gets copied to B2 under a 90 day COMPLIANCE lock, and COMPLIANCE mode
 * cannot be shortened by anyone, including the account root. So a mistake here
 * is not a mistake that can be cleaned up next week. That is the whole reason
 * this filter is tested rather than trusted.
 *
 * Two failures, in opposite directions, and the second is the dangerous one:
 *
 *   1. Copying a Supabase `.emptyFolderPlaceholder`. Zero bytes, no family
 *      content, so not an exposure. It is a permanent undeletable non-file in
 *      the copy of last resort, keyed by path to an archive id that may not
 *      exist, plus a V6 orphan line on every verify run forever. One exists
 *      today under photographs/f44f1818-.../ where the last real photograph was
 *      deleted on August 8, 2026.
 *
 *   2. Skipping a real object because it happens to be zero bytes. A content
 *      file that has gone to zero bytes is a fact worth backing up and worth
 *      surfacing. Filtering by size would hide exactly the failure the backup
 *      exists to notice, and hide it in silence, because a skipped object
 *      raises no alarm. This is why the filter is a NAME match, and most of the
 *      cases below exist to keep it one.
 *
 * Storage is mocked. Nothing here can reach Supabase or B2.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Entry = {
  name:        string
  id:          string | null
  created_at?: string | null
  metadata?:   { size?: number; eTag?: string } | null
}

const H = vi.hoisted(() => {
  const state = {
    /** bucket -> prefix ('' is root) -> entries */
    tree:      {} as Record<string, Record<string, Entry[]>>,
    listCalls: [] as { bucket: string; prefix: string; offset: number }[],
    listError: null as string | null,
  }

  const supabaseAdmin = {
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string, opts: { limit: number; offset: number }) => {
          state.listCalls.push({ bucket, prefix, offset: opts.offset })
          if (state.listError) return { data: null, error: { message: state.listError } }
          // Only page 0 has content. These fixtures are far under the 1000 cap.
          const entries = opts.offset === 0 ? (state.tree[bucket]?.[prefix] ?? []) : []
          return { data: entries, error: null }
        },
      }),
    },
  }

  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: H.supabaseAdmin }))
vi.mock('@/lib/resend', () => ({ resend: { emails: { send: vi.fn() } } }))
vi.mock('@/lib/inngest', () => ({
  inngest: { createFunction: () => ({}), send: vi.fn() },
}))
vi.mock('@/lib/storageBackupB2', () => ({
  getObjectBytes: vi.fn(),
  listAll:        vi.fn(),
  putLocked:      vi.fn(),
}))

import { walkBucket } from '@/lib/inngest/storageBackupFunctions'
import {
  EMPTY_FOLDER_PLACEHOLDER,
  isEmptyFolderPlaceholder,
  type SourceObject,
} from '@/lib/storageBackup'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const A1 = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
const F44 = 'f44f1818-8f17-499d-8f27-23e286e923f7'

const folder = (name: string): Entry => ({ name, id: null })

const object = (name: string, size: number): Entry => ({
  name,
  id: `obj-${name}`,
  created_at: '2026-08-01T00:00:00.000Z',
  metadata: { size, eTag: 'abc123' },
})

/** The real thing, as Supabase returns it. Zero bytes, real id, real row. */
const placeholder = (): Entry => ({
  name: EMPTY_FOLDER_PLACEHOLDER,
  id: 'obj-placeholder',
  created_at: '2026-08-08T21:26:23.193Z',
  metadata: { size: 0, eTag: 'd41d8cd98f00b204e9800998ecf8427e' },
})

function setTree(tree: Record<string, Record<string, Entry[]>>) {
  H.state.tree = tree
}

async function walk(bucket: string): Promise<SourceObject[]> {
  const out: SourceObject[] = []
  await walkBucket(bucket, '', out)
  return out
}

beforeEach(() => {
  H.state.tree      = {}
  H.state.listCalls = []
  H.state.listError = null
})

// ── The predicate, on its own ─────────────────────────────────────────────────

describe('isEmptyFolderPlaceholder', () => {
  it('matches the bare marker name', () => {
    expect(isEmptyFolderPlaceholder('.emptyFolderPlaceholder')).toBe(true)
  })

  it('matches the marker at the end of a path', () => {
    expect(isEmptyFolderPlaceholder(`${F44}/.emptyFolderPlaceholder`)).toBe(true)
    expect(isEmptyFolderPlaceholder(`a/b/c/.emptyFolderPlaceholder`)).toBe(true)
  })

  it('does not match a real file that merely contains the string', () => {
    expect(isEmptyFolderPlaceholder('.emptyFolderPlaceholder.jpg')).toBe(false)
    expect(isEmptyFolderPlaceholder('my.emptyFolderPlaceholder')).toBe(false)
    expect(isEmptyFolderPlaceholder('.emptyFolderPlaceholder/real.jpg')).toBe(false)
  })

  it('does not match ordinary photographs', () => {
    expect(isEmptyFolderPlaceholder('1776459942752-contrib-pd4q5eb.jpeg')).toBe(false)
    expect(isEmptyFolderPlaceholder('')).toBe(false)
  })

  it('is exported as a constant so nothing has to retype the literal', () => {
    expect(EMPTY_FOLDER_PLACEHOLDER).toBe('.emptyFolderPlaceholder')
  })
})

// ── The filter, where it is actually applied ──────────────────────────────────

describe('walkBucket drops the placeholder', () => {
  it('excludes it, reproducing the live photographs/f44f1818 case', async () => {
    setTree({
      photographs: {
        '':     [folder(F44)],
        [F44]:  [placeholder()],
      },
    })

    const out = await walk('photographs')

    expect(out).toEqual([])
  })

  it('keeps the real objects in a prefix that also holds a placeholder', async () => {
    setTree({
      photographs: {
        '':    [folder(A1)],
        [A1]:  [object('a.jpg', 1000), placeholder(), object('b.jpg', 2000)],
      },
    })

    const out = await walk('photographs')

    expect(out.map((o) => o.path)).toEqual([`${A1}/a.jpg`, `${A1}/b.jpg`])
  })

  it('excludes a placeholder sitting at the bucket root', async () => {
    setTree({ photographs: { '': [placeholder(), object('loose.jpg', 500)] } })

    const out = await walk('photographs')

    expect(out.map((o) => o.path)).toEqual(['loose.jpg'])
  })

  it('excludes placeholders across several prefixes at once', async () => {
    setTree({
      photographs: {
        '':    [folder(A1), folder(F44)],
        [A1]:  [object('a.jpg', 10), placeholder()],
        [F44]: [placeholder()],
      },
    })

    const out = await walk('photographs')

    expect(out.map((o) => o.path)).toEqual([`${A1}/a.jpg`])
  })

  it('still descends into a prefix, so the filter does not swallow the folder', async () => {
    // Supabase returns a nested folder as a bare segment name, not a full path,
    // so the walk builds `A1/nested` itself. The fixture has to match that.
    setTree({
      photographs: {
        '':               [folder(A1)],
        [A1]:             [folder('nested')],
        [`${A1}/nested`]: [object('deep.jpg', 42), placeholder()],
      },
    })

    const out = await walk('photographs')

    expect(out.map((o) => o.path)).toEqual([`${A1}/nested/deep.jpg`])
  })
})

// ── The direction that matters more: not a size filter ────────────────────────

describe('walkBucket is a name filter and not a zero byte filter', () => {
  it('KEEPS a real object that is zero bytes', async () => {
    setTree({
      photographs: {
        '':   [folder(A1)],
        [A1]: [object('truncated.jpg', 0)],
      },
    })

    const out = await walk('photographs')

    // A content file that has gone to zero bytes is a fact worth backing up and
    // worth surfacing. Dropping it here would hide it in silence.
    expect(out).toHaveLength(1)
    expect(out[0].path).toBe(`${A1}/truncated.jpg`)
    expect(out[0].size).toBe(0)
  })

  it('KEEPS a zero byte object whose name only resembles the marker', async () => {
    setTree({
      photographs: {
        '':   [folder(A1)],
        [A1]: [object('.emptyFolderPlaceholder.jpg', 0)],
      },
    })

    const out = await walk('photographs')

    expect(out.map((o) => o.path)).toEqual([`${A1}/.emptyFolderPlaceholder.jpg`])
  })

  it('KEEPS an object with no metadata at all, recorded as zero bytes', async () => {
    setTree({
      photographs: {
        '':   [folder(A1)],
        [A1]: [{ name: 'nometa.jpg', id: 'obj-nometa', created_at: null, metadata: null }],
      },
    })

    const out = await walk('photographs')

    expect(out).toEqual([{
      bucket:    'photographs',
      path:      `${A1}/nometa.jpg`,
      size:      0,
      etag:      null,
      createdAt: null,
    }])
  })
})

// ── Everything else the walk still has to do ──────────────────────────────────

describe('walkBucket, unchanged behaviour', () => {
  it('carries bucket, path, size, etag, and createdAt through', async () => {
    setTree({
      'voice-recordings': {
        '':   [folder(A1)],
        [A1]: [object('take-1.m4a', 4096)],
      },
    })

    const out = await walk('voice-recordings')

    expect(out).toEqual([{
      bucket:    'voice-recordings',
      path:      `${A1}/take-1.m4a`,
      size:      4096,
      etag:      'abc123',
      createdAt: '2026-08-01T00:00:00.000Z',
    }])
  })

  it('returns nothing for an empty bucket', async () => {
    setTree({ 'archive-documents': { '': [] } })
    expect(await walk('archive-documents')).toEqual([])
  })

  it('throws on a list error rather than returning a short source set', async () => {
    setTree({ photographs: { '': [] } })
    H.state.listError = 'bucket unreachable'

    // A silently short source list reads as "nothing new to copy" and the run
    // goes green over a backup that covered nothing.
    await expect(walk('photographs')).rejects.toThrow(/bucket unreachable/)
  })
})
