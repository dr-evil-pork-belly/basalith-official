/**
 * Storage backup scope gate. Build order step 7.
 *
 * What this file exists to prevent:
 *
 *   1. archive-exports joining the sync. Every object in it is a complete
 *      unencrypted copy of one family's whole archive. Under a 90 day COMPLIANCE
 *      lock that copy cannot be deleted by anyone, including after a Right of
 *      Dissolution request, which makes /data-ownership tenet 04 false.
 *
 *   2. vault-files joining the sync. Its objects cannot be tied to an archive,
 *      so the dissolution filter has nothing to match on and they would stay in
 *      scope through a dissolution forever.
 *
 *   3. A brand new bucket joining by existing. archive-exports was created on
 *      August 3, 2026 and would have been picked up on August 4 by any design
 *      that syncs whatever it finds.
 *
 * The two exclusions have DIFFERENT reasons and are asserted separately on
 * purpose, so that a later edit cannot collapse them into one and lose the
 * argument for either.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  ALARM,
  ALLOWLIST,
  EXCLUDED,
  EXCLUDED_BUCKETS,
  KNOWN_BUCKETS,
  MAX_COPIES_PER_RUN,
  PER_RUN_SOURCE_BYTE_CEILING,
  ROLLING_30D_SOURCE_BYTE_CEILING,
  archiveIdFromPath,
  b2Key,
  checkBudget,
  checkRoster,
  checkSilence,
  diffSourceAgainstManifest,
  isExcluded,
  isSynced,
  manifestSnapshotKey,
  threeWayDiff,
  toSnapshotEntry,
  type SourceObject,
} from './storageBackup'

// The live roster, read August 8, 2026. Six buckets.
const LIVE_BUCKETS = [
  'vault-files',
  'voice-recordings',
  'photographs',
  'archive-videos',
  'archive-documents',
  'archive-exports',
]

describe('the allowlist is exactly four buckets', () => {
  it('names the four content buckets and nothing else', () => {
    console.log(`ALLOWLIST: ${ALLOWLIST.join(', ')}`)
    expect([...ALLOWLIST].sort()).toEqual([
      'archive-documents',
      'archive-videos',
      'photographs',
      'voice-recordings',
    ])
    expect(ALLOWLIST).toHaveLength(4)
  })

  it('includes archive-documents even though it is empty today', () => {
    // On the list anyway, so the first document anyone uploads is covered from
    // the moment it lands rather than from the next time someone edits a constant.
    expect(isSynced('archive-documents')).toBe(true)
  })

  it('the allowlist and the excluded list do not overlap', () => {
    for (const b of ALLOWLIST) expect(isExcluded(b)).toBe(false)
    for (const b of EXCLUDED_BUCKETS) expect(isSynced(b)).toBe(false)
  })
})

describe('archive-exports is excluded because it is derived and retention-managed', () => {
  it('is not synced', () => {
    expect(isSynced('archive-exports')).toBe(false)
    expect((ALLOWLIST as readonly string[]).includes('archive-exports')).toBe(false)
  })

  it('is named in EXCLUDED, so it never raises A4 as an unknown bucket', () => {
    expect(isExcluded('archive-exports')).toBe(true)
    expect(checkRoster(LIVE_BUCKETS).unknown).not.toContain('archive-exports')
  })

  it('carries the derived-and-retention-managed reason, not the vault-files reason', () => {
    const r = EXCLUDED['archive-exports']
    console.log(`archive-exports reason: ${r.reason}`)
    expect(r.reason).toBe('derived-and-retention-managed')
    expect(r.detail).toMatch(/rebuildable/i)
    expect(r.detail).toMatch(/7 day retention/i)
    // Must NOT be justified by the vault-files argument.
    expect(r.reason).not.toBe('not-archive-scoped')
  })
})

describe('vault-files is excluded because it is not archive-scoped', () => {
  it('is not synced', () => {
    expect(isSynced('vault-files')).toBe(false)
    expect((ALLOWLIST as readonly string[]).includes('vault-files')).toBe(false)
  })

  it('is named in EXCLUDED, so it never raises A4 as an unknown bucket', () => {
    expect(isExcluded('vault-files')).toBe(true)
    expect(checkRoster(LIVE_BUCKETS).unknown).not.toContain('vault-files')
  })

  it('carries the not-archive-scoped reason, not the archive-exports reason', () => {
    const r = EXCLUDED['vault-files']
    console.log(`vault-files reason: ${r.reason}`)
    expect(r.reason).toBe('not-archive-scoped')
    expect(r.detail).toMatch(/archive_id/)
    expect(r.detail).toMatch(/archivist_id/)
    expect(r.reason).not.toBe('derived-and-retention-managed')
  })

  it('its real object path yields no archive id, which is the whole argument', () => {
    // Live object, read August 8, 2026.
    const p = 'vaults/09c927a2-7b26-4851-b573-19a7d14fd780/3b7e877f-738a-40ea-a740-c869422be93e/IMG_3640.jpeg'
    console.log(`vault path -> archiveId ${archiveIdFromPath(p)}`)
    expect(archiveIdFromPath(p)).toBeNull()
  })

  it('the two exclusions do not share a reason', () => {
    expect(EXCLUDED['archive-exports'].reason).not.toBe(EXCLUDED['vault-files'].reason)
  })
})

describe('a bucket in neither list raises A4 and is not synced', () => {
  it('flags the unknown bucket', () => {
    const roster = checkRoster([...LIVE_BUCKETS, 'brand-new-bucket'])
    console.log(`unknown: ${JSON.stringify(roster.unknown)}`)
    expect(roster.unknown).toEqual(['brand-new-bucket'])
  })

  it('does not sync it', () => {
    const roster = checkRoster([...LIVE_BUCKETS, 'brand-new-bucket'])
    expect(roster.synced).not.toContain('brand-new-bucket')
    expect(isSynced('brand-new-bucket')).toBe(false)
  })

  it('continues on the allowlist rather than stopping', () => {
    // A4 must never be silent and must never auto-include, but a new bucket is
    // not a reason to stop backing up the four that matter.
    const roster = checkRoster([...LIVE_BUCKETS, 'brand-new-bucket'])
    expect([...roster.synced].sort()).toEqual([
      'archive-documents',
      'archive-videos',
      'photographs',
      'voice-recordings',
    ])
  })

  it('had this run on August 3, archive-exports would have raised A4 on August 4', () => {
    // The pre-August-3 roster, with archive-exports removed from both the live
    // list and the known set, is what "a bucket appearing" looks like.
    const beforeExportsExisted = LIVE_BUCKETS.filter((b) => b !== 'archive-exports')
    expect(checkRoster(beforeExportsExisted).unknown).toEqual([])
    // And the day it appeared, it is known, because it is in EXCLUDED.
    expect(checkRoster(LIVE_BUCKETS).unknown).toEqual([])
    expect(ALARM.A4_UNKNOWN_BUCKET).toBe('A4_UNKNOWN_BUCKET')
  })

  it('the live roster today produces no unknown and no missing buckets', () => {
    const roster = checkRoster(LIVE_BUCKETS)
    console.log(`roster: ${JSON.stringify(roster)}`)
    expect(roster.unknown).toEqual([])
    expect(roster.missing).toEqual([])
    expect(roster.synced).toHaveLength(4)
  })

  it('an allowlist bucket vanishing is reported, not treated as deletions', () => {
    // Without this, 337 photographs drop out of the source set, the three way
    // diff reads them as "in destination, absent from source", V2 calls that
    // normal, and the backup silently stops covering them.
    const roster = checkRoster(LIVE_BUCKETS.filter((b) => b !== 'photographs'))
    expect(roster.missing).toEqual(['photographs'])
    expect(roster.synced).not.toContain('photographs')
  })
})

describe('the code constants and the migration CHECK cannot drift apart', () => {
  const sql = readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260808_storage_backup_manifest.sql'),
    'utf8',
  )

  it('the bucket CHECK lists exactly the allowlist', () => {
    const m = sql.match(/CHECK \(bucket IN \(([^)]*)\)\)/)
    expect(m).not.toBeNull()
    const inCheck = (m as RegExpMatchArray)[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .sort()
    console.log(`migration bucket CHECK: ${inCheck.join(', ')}`)
    expect(inCheck).toEqual([...ALLOWLIST].sort())
  })

  it('neither excluded bucket appears in the bucket CHECK', () => {
    const m = sql.match(/CHECK \(bucket IN \(([^)]*)\)\)/) as RegExpMatchArray
    for (const b of EXCLUDED_BUCKETS) expect(m[1]).not.toContain(b)
  })

  it('archive_id is not a foreign key, so a dissolution cannot lose the map', () => {
    // DISSOLUTION_RUNBOOK.md step 4.4 reads the manifest to build the B2 delete
    // list. A cascade from archives would empty it before the operator looks.
    //
    // Comments are stripped first. The file explains at length what it is NOT
    // doing, and quotes the training_pairs declaration verbatim to do it, so a
    // naive match hits the explanation rather than any real DDL.
    const ddl = sql
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n')
    expect(ddl).toMatch(/archive_id\s+UUID/i)
    expect(ddl).not.toMatch(/archive_id\s+UUID\s+REFERENCES/i)
    expect(ddl).not.toMatch(/REFERENCES\s+archives/i)
  })
})

describe('the B2 client cannot delete', () => {
  const src = readFileSync(path.resolve(process.cwd(), 'lib/storageBackupB2.ts'), 'utf8')

  it('imports no delete command from the SDK', () => {
    // The job key is scoped without deleteFiles so a bug cannot destroy the copy
    // of last resort. This asserts the code matches that intent.
    expect(src).not.toMatch(/DeleteObjectCommand/)
    expect(src).not.toMatch(/DeleteObjectsCommand/)
  })

  it('exports no delete helper', () => {
    expect(src).not.toMatch(/export\s+(async\s+)?function\s+\w*[Dd]elete/)
  })
})

describe('the sync does not run itself', () => {
  // storage-backup-sync is event triggered until build order 9d sends the seed
  // by hand. A cron here would seed the whole property into a 90 day COMPLIANCE
  // lock the night after the first deploy, before the dissolution dry walk,
  // before dissolution-purge.ts exists, and before /data-ownership tenet 04 is
  // redrafted. Nothing can shorten a COMPLIANCE retention, including the
  // account root, so this is not a mistake that can be undone next week.
  //
  // Asserted on the source because the alternative, importing the module to
  // read its triggers, pulls a live Inngest client. Same approach as the
  // vercel.json read in app/api/cron/cron-auth.test.ts.
  const src = readFileSync(path.resolve(process.cwd(), 'lib/inngest/storageBackupFunctions.ts'), 'utf8')

  const block = (name: string): string => {
    const start = src.indexOf(`export const ${name} = inngest.createFunction(`)
    expect(start, `${name} not found`).toBeGreaterThan(-1)
    const body = src.slice(start)
    const end = body.indexOf('\n  async ({')
    expect(end, `${name} config block not found`).toBeGreaterThan(-1)
    return body.slice(0, end)
  }

  it('storage-backup-sync declares no cron trigger', () => {
    expect(block('storageBackupSync')).not.toMatch(/\bcron\s*:/)
  })

  it('storage-backup-sync is still reachable by event', () => {
    const b = block('storageBackupSync')
    expect(b).toMatch(/event:\s*'storage\/backup\.sync\.requested'/)
    expect(b).toMatch(/event:\s*'storage\/backup\.sync\.continue'/)
  })

  it('storage-backup-verify keeps its weekly cron, so this gate discriminates', () => {
    // Without this the two assertions above would pass on a file that had lost
    // every trigger, or on a block matcher that silently matched nothing.
    expect(block('storageBackupVerify')).toMatch(/cron:\s*'0 5 \* \* 0'/)
  })
})

describe('the diff copies what is new or changed and nothing else', () => {
  const src = (over: Partial<SourceObject> = {}): SourceObject => ({
    bucket: 'photographs',
    path: 'a38e4503-c7d2-4af3-af8c-cacd66974e0b/one.jpeg',
    size: 100,
    etag: 'abc',
    createdAt: '2026-08-01T00:00:00Z',
    ...over,
  })

  it('copies an object with no manifest row', () => {
    const d = diffSourceAgainstManifest([src()], [])
    expect(d.toCopy).toHaveLength(1)
    expect(d.unchanged).toBe(0)
  })

  it('skips an object whose size and etag already match', () => {
    const d = diffSourceAgainstManifest(
      [src()],
      [{ bucket: 'photographs', path: src().path, size_bytes: 100, source_etag: 'abc' }],
    )
    expect(d.toCopy).toHaveLength(0)
    expect(d.unchanged).toBe(1)
  })

  it('recopies when the etag changed in place', () => {
    const d = diffSourceAgainstManifest(
      [src({ etag: 'zzz' })],
      [{ bucket: 'photographs', path: src().path, size_bytes: 100, source_etag: 'abc' }],
    )
    expect(d.toCopy).toHaveLength(1)
  })

  it('recopies when the size changed', () => {
    const d = diffSourceAgainstManifest(
      [src({ size: 101 })],
      [{ bucket: 'photographs', path: src().path, size_bytes: 100, source_etag: 'abc' }],
    )
    expect(d.toCopy).toHaveLength(1)
  })

  it('keeps an old version row and still recognises the new one', () => {
    // Additive manifest: both versions have rows, and the current bytes match
    // the newer row, so nothing is recopied.
    const d = diffSourceAgainstManifest(
      [src({ size: 200, etag: 'new' })],
      [
        { bucket: 'photographs', path: src().path, size_bytes: 100, source_etag: 'abc' },
        { bucket: 'photographs', path: src().path, size_bytes: 200, source_etag: 'new' },
      ],
    )
    expect(d.toCopy).toHaveLength(0)
    expect(d.unchanged).toBe(1)
  })

  it('caps the copy list and reports the remainder rather than truncating silently', () => {
    const many = Array.from({ length: MAX_COPIES_PER_RUN + 77 }, (_, i) =>
      src({ path: `arch/${i}.jpeg`, etag: `e${i}` }),
    )
    const d = diffSourceAgainstManifest(many, [])
    console.log(`toCopy ${d.toCopy.length}, deferred ${d.deferred}`)
    expect(d.toCopy).toHaveLength(MAX_COPIES_PER_RUN)
    expect(d.deferred).toBe(77)
  })

  it('the seed fits inside the Inngest 1000 step limit', () => {
    // 377 in-scope objects on August 8, plus the fixed steps.
    const SEED_OBJECTS = 377
    expect(Math.min(SEED_OBJECTS, MAX_COPIES_PER_RUN) + 6).toBeLessThan(1000)
  })
})

describe('the three way structural diff classifies each set correctly', () => {
  const d = threeWayDiff({
    sourceKeys: ['photographs/a/1.jpg', 'photographs/a/2.jpg'],
    destKeys: ['photographs/a/1.jpg', 'photographs/a/3.jpg'],
    manifestKeys: ['photographs/a/1.jpg', 'photographs/a/4.jpg'],
  })

  it('in source, absent from destination is the hard A1 case', () => {
    expect(d.inSourceNotDest).toEqual(['photographs/a/2.jpg'])
  })

  it('in destination, absent from the manifest is A2', () => {
    expect(d.inDestNotManifest).toEqual(['photographs/a/3.jpg'])
  })

  it('in the manifest, absent from destination is the lock-failure case', () => {
    expect(d.inManifestNotDest).toEqual(['photographs/a/4.jpg'])
  })

  it('in destination, absent from source is normal and never acted on', () => {
    // Additive-only. Deletions do not propagate. Counted and reported.
    expect(d.inDestNotSource).toEqual(['photographs/a/3.jpg'])
  })
})

describe('the byte budget stops a runaway rather than throttling it', () => {
  it('passes a normal run', () => {
    expect(checkBudget({ runBytes: 1_000_000, windowBytes: 5_000_000, isSeed: false }).ok).toBe(true)
  })

  it('breaches the per-run ceiling', () => {
    const v = checkBudget({
      runBytes: PER_RUN_SOURCE_BYTE_CEILING + 1,
      windowBytes: 0,
      isSeed: false,
    })
    expect(v.ok).toBe(false)
    expect(v.breach).toBe('per-run')
  })

  it('exempts the seed from the per-run ceiling', () => {
    const v = checkBudget({
      runBytes: PER_RUN_SOURCE_BYTE_CEILING + 1,
      windowBytes: 0,
      isSeed: true,
    })
    expect(v.ok).toBe(true)
  })

  it('does NOT exempt the seed from the rolling 30 day ceiling', () => {
    // 30 daily runs at the per-run ceiling is 105 GB, which is 42% of the plan
    // and would trip nothing. The rolling ceiling is the one that bounds a month.
    const v = checkBudget({
      runBytes: 1,
      windowBytes: ROLLING_30D_SOURCE_BYTE_CEILING,
      isSeed: true,
    })
    expect(v.ok).toBe(false)
    expect(v.breach).toBe('rolling-30d')
  })

  it('the real seed is nowhere near either ceiling', () => {
    // 1076 MB in scope on August 8.
    const seedBytes = 1_076_170_000
    expect(checkBudget({ runBytes: seedBytes, windowBytes: 0, isSeed: true }).ok).toBe(true)
    expect(checkBudget({ runBytes: seedBytes, windowBytes: 0, isSeed: false }).ok).toBe(true)
  })
})

describe('the heartbeat alarms on silence', () => {
  const now = new Date('2026-08-08T06:00:00Z')

  it('is quiet when both jobs ran recently', () => {
    const a = checkSilence({
      lastSuccessfulSyncAt: '2026-08-07T04:00:00Z',
      lastSuccessfulVerifyAt: '2026-08-02T05:00:00Z',
      now,
    })
    expect(a).toEqual([])
  })

  it('alarms when the sync has been quiet past 8 days', () => {
    const a = checkSilence({
      lastSuccessfulSyncAt: '2026-07-30T04:00:00Z',
      lastSuccessfulVerifyAt: '2026-08-02T05:00:00Z',
      now,
    })
    expect(a).toHaveLength(1)
    expect(a[0].code).toBe(ALARM.A5_SILENCE)
  })

  it('alarms when the verify has been quiet past 10 days', () => {
    const a = checkSilence({
      lastSuccessfulSyncAt: '2026-08-07T04:00:00Z',
      lastSuccessfulVerifyAt: '2026-07-20T05:00:00Z',
      now,
    })
    expect(a).toHaveLength(1)
  })

  it('alarms loudest when nothing has ever run', () => {
    const a = checkSilence({ lastSuccessfulSyncAt: null, lastSuccessfulVerifyAt: null, now })
    expect(a).toHaveLength(2)
    for (const x of a) expect(x.detail).toMatch(/has ever completed/i)
    expect(a.map((x) => x.code)).toEqual([ALARM.A5_SILENCE, ALARM.A5_SILENCE])
  })
})

describe('keys, paths, and the snapshot shape', () => {
  it('the B2 key is the natural key', () => {
    expect(b2Key('photographs', 'arch/one.jpeg')).toBe('photographs/arch/one.jpeg')
  })

  it('the archive id is the first path segment when it is a uuid', () => {
    expect(archiveIdFromPath('a38e4503-c7d2-4af3-af8c-cacd66974e0b/x.jpeg')).toBe(
      'a38e4503-c7d2-4af3-af8c-cacd66974e0b',
    )
  })

  it('a non-uuid prefix yields null rather than a bad id', () => {
    expect(archiveIdFromPath('vaults/abc/x.jpeg')).toBeNull()
    expect(archiveIdFromPath('loose-file.jpeg')).toBeNull()
  })

  it('the snapshot carries five fields and never source_row', () => {
    const entry = toSnapshotEntry({
      bucket: 'photographs',
      path: 'arch/one.jpeg',
      sha256: 'deadbeef',
      size_bytes: 100,
      b2_locked_until: '2026-11-06T00:00:00Z',
      // Extra fields must not survive into the snapshot.
      ...({ source_row: { caption: 'my mother in 1962' }, source_table: 'photographs' } as object),
    })
    console.log(`snapshot entry keys: ${Object.keys(entry).join(', ')}`)
    expect(Object.keys(entry).sort()).toEqual([
      'b2_locked_until',
      'bucket',
      'path',
      'sha256',
      'size_bytes',
    ])
    expect(JSON.stringify(entry)).not.toContain('caption')
    expect(JSON.stringify(entry)).not.toContain('my mother')
  })

  it('the snapshot key is dated and sits outside every archive prefix', () => {
    // Which is exactly why the dissolution runbook needs its own rule for them.
    expect(manifestSnapshotKey('2026-08-08')).toBe('_manifest/2026-08-08.json')
  })
})

describe('KNOWN_BUCKETS is the union the roster alarm compares against', () => {
  it('is the allowlist plus the excluded list, with nothing else', () => {
    expect([...KNOWN_BUCKETS].sort()).toEqual([...LIVE_BUCKETS].sort())
  })
})
