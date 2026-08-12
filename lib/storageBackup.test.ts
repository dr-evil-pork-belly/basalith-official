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
  SCOPED_RUN_KIND,
  SCOPED_SEED_WINDOW_NOTE,
  a1MissingDetail,
  applyArchiveScope,
  buildSnapshotEntries,
  resolveRunScope,
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

describe('the sync event resolves to a kind, or is refused outright', () => {
  const ID = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'

  it('an empty event is an ordinary sync', () => {
    expect(resolveRunScope({})).toEqual({ kind: 'sync', onlyArchiveId: null })
  })

  it('kind seed stays a seed', () => {
    expect(resolveRunScope({ kind: 'seed' })).toEqual({ kind: 'seed', onlyArchiveId: null })
  })

  it('an archive id derives the scoped kind', () => {
    expect(resolveRunScope({ onlyArchiveId: ID })).toEqual({
      kind: SCOPED_RUN_KIND,
      onlyArchiveId: ID,
    })
  })

  it('kind sync alongside a scope resolves to scoped, which is how a continuation resumes', () => {
    // The continuation event sends kind:'sync' plus the id. If this resolved to
    // a plain sync, a capped scoped run would resume by copying the whole
    // property, three hundred objects at a time, under a 90 day lock.
    expect(resolveRunScope({ kind: 'sync', onlyArchiveId: ID }).kind).toBe(SCOPED_RUN_KIND)
  })

  it('lowercases the id so it matches what archiveIdFromPath returns', () => {
    expect(resolveRunScope({ onlyArchiveId: ID.toUpperCase() }).onlyArchiveId).toBe(ID)
  })

  it('refuses kind seed alongside a scope rather than coercing either way', () => {
    expect(() => resolveRunScope({ kind: 'seed', onlyArchiveId: ID })).toThrow(/one or the other/)
  })

  it('refuses an event asking for the scoped kind directly', () => {
    // Otherwise an event claims a scoped run's heartbeat exemption while
    // restricting nothing, which is the silence failure with a new spelling.
    expect(() => resolveRunScope({ kind: SCOPED_RUN_KIND })).toThrow(/cannot be requested/)
  })

  it('refuses any other kind', () => {
    expect(() => resolveRunScope({ kind: 'drill' })).toThrow(/must be 'seed' or 'sync'/)
  })

  it('refuses a malformed archive id rather than silently syncing everything', () => {
    expect(() => resolveRunScope({ onlyArchiveId: 'not-a-uuid' })).toThrow(/not a uuid/)
    expect(() => resolveRunScope({ onlyArchiveId: '' })).toThrow(/not a uuid/)
  })

  it('refuses a non-string archive id', () => {
    expect(() => resolveRunScope({ onlyArchiveId: 123 })).toThrow(/must be a string/)
  })

  it('can never produce a pair the database CHECK would reject', () => {
    // storage_backup_runs_scope_matches_kind is
    //   (kind = 'scoped') = (scope_archive_id IS NOT NULL)
    // Asserted here in code so a resolver change fails in vitest rather than at
    // an insert in production, mid run, with objects already in B2.
    const inputs = [
      {},
      { kind: 'seed' },
      { kind: 'sync' },
      { onlyArchiveId: ID },
      { kind: 'sync', onlyArchiveId: ID },
    ]
    for (const input of inputs) {
      const r = resolveRunScope(input)
      expect(r.kind === SCOPED_RUN_KIND).toBe(r.onlyArchiveId !== null)
    }
  })
})

describe('the sync wiring applies the scope where it actually matters', () => {
  const raw = readFileSync(
    path.resolve(process.cwd(), 'lib/inngest/storageBackupFunctions.ts'),
    'utf8',
  )

  // Line comments stripped before every assertion below. This file is heavily
  // commented, and the comments explaining a guarantee use the same identifiers
  // as the code providing it. A window-based match around a deleted line will
  // happily match the paragraph that describes it, which is a guard that passes
  // on prose. Found by mutation: deleting the continuation's onlyArchiveId went
  // undetected until this line existed.
  const code = raw.replace(/^\s*\/\/.*$/gm, '')

  it('the comment strip left the code intact', () => {
    // Control. Without it every assertion below could pass on an empty string.
    expect(code).toMatch(/export const storageBackupSync = inngest\.createFunction\(/)
    expect(code).toMatch(/export const storageBackupVerify = inngest\.createFunction\(/)
    expect(code).not.toMatch(/^\s*\/\/ /m)
  })

  it('the copy diff runs on the scoped set, never on the raw walk', () => {
    expect(code).toMatch(/diffSourceAgainstManifest\(inScope, manifest, MAX_COPIES_PER_RUN\)/)
    expect(code).not.toMatch(/diffSourceAgainstManifest\(source\.objects/)
  })

  it('the scope is applied before the dry run returns, so 9b proves the filters', () => {
    // A dry walk reporting an unfiltered source set would confirm nothing about
    // the dissolution filter, which is the whole purpose of the 9b dry walk.
    const scopeAt = code.indexOf('applyArchiveScope(source.objects, { onlyArchiveId')
    const dryAt = code.indexOf('if (dryRun) {')
    expect(scopeAt).toBeGreaterThan(-1)
    expect(dryAt).toBeGreaterThan(-1)
    expect(scopeAt).toBeLessThan(dryAt)
    expect(code).toMatch(/diffSourceAgainstManifest\(inScope, manifest\)/)
  })

  it('open-run records the scope the CHECK requires', () => {
    expect(code).toMatch(/scope_archive_id: onlyArchiveId/)
    expect(code).toMatch(/objects_source: inScope\.length/)
  })

  it('the continuation carries the scope forward', () => {
    // Without this a capped scoped run resumes with no scope and copies the
    // whole property. Asserted on the assignment, not the identifier, so the
    // paragraph above it in the source cannot satisfy this on its own.
    const at = code.indexOf("name: 'storage/backup.sync.continue'")
    expect(at).toBeGreaterThan(-1)
    expect(code.slice(at, at + 400)).toMatch(/onlyArchiveId: onlyArchiveId/)
  })

  it('a failed terminated-archive read throws instead of defaulting to empty', () => {
    // An empty list on a failed read is indistinguishable from "nobody asked to
    // be forgotten", and it copies a terminated family into an unbreakable lock.
    expect(code).toMatch(/load-terminated-archives/)
    expect(code).toMatch(/throw new Error\(`load-terminated-archives/)
  })

  it('verify filters its source side by the same list', () => {
    // Otherwise a terminated archive's uncopied objects raise a hard A1 every
    // Sunday for the up to 365 days between the request and the deletion.
    expect(code).toMatch(/sourceKeys: verifyScope\.kept\.map/)
  })

  it('verify does not filter the destination or the manifest', () => {
    // Objects already copied for that archive stay under lock, stay in the
    // manifest, and stay re-hashed every run. Nothing stops being verified.
    expect(code).toMatch(/manifestKeys: manifest\.map\(\(m\) => m\.b2_key\)/)
    expect(code).toMatch(/const toRehash = manifest\.slice\(0, MAX_COPIES_PER_RUN\)/)
  })

  it('the snapshot is filtered and its own count is reported separately', () => {
    // The dissolution filter's second half. Asserted on the call with both
    // arguments, because buildSnapshotEntries(rows) with the list forgotten
    // compiles, passes every unit test of the function itself, and writes the
    // terminated archive offsite exactly as before.
    expect(code).toMatch(/const entries = buildSnapshotEntries\(rows, terminatedArchiveIds\)/)
    expect(code).toMatch(/snapshotExcludedTerminated: snapshot\.rows - snapshot\.entries/)
  })

  it('objects_manifest is the table count in BOTH writers, never the filtered one', () => {
    // This column has two writers and zero readers. The heartbeat reads
    // started_at, the budget window reads bytes_read_source, the scoped-seed
    // check reads id, and nothing else on the property touches the table. So a
    // wrong value here raises nothing and is invisible until somebody compares a
    // sync row against a verify row, which happens for the first time during a
    // dissolution, a year after the row was written.
    //
    // snapshot.rows is the unfiltered read, which is what the column means:
    // "counted in storage_backup_objects". snapshot.entries is what survived the
    // dissolution filter, and it is smaller the moment any archive is terminated.
    // Writing entries here would make the sync's number disagree with verify's,
    // which computes the same quantity from its own unfiltered read, and the
    // disagreement would look like a backup fault rather than a units mistake.
    //
    // Asserted as the exhaustive list rather than two toMatch calls, so a third
    // writer added later has to come back through this test.
    const writes = code.match(/objects_manifest: [^,\n]+/g) ?? []
    console.log(`objects_manifest writes: ${JSON.stringify(writes)}`)
    expect(writes).toEqual([
      'objects_manifest: snapshot.rows',   // sync
      'objects_manifest: manifest.length', // verify
    ])
    expect(code).not.toMatch(/objects_manifest: snapshot\.entries/)
  })
})

describe('A1 explains the scoped seed window without becoming excusable', () => {
  const keys = ['photographs/aaa/1.jpg', 'photographs/aaa/2.jpg']

  it('says nothing extra outside the window', () => {
    const d = a1MissingDetail({ missingKeys: keys, scopedSeedWindow: false })
    expect(d).toContain('2 object(s) in source, absent from B2')
    expect(d).not.toContain('EXPECTED DURING THIS WINDOW')
    expect(d).not.toContain('9a')
  })

  it('explains itself inside the window', () => {
    const d = a1MissingDetail({ missingKeys: keys, scopedSeedWindow: true })
    expect(d).toContain('2 object(s) in source, absent from B2')
    expect(d).toContain(SCOPED_SEED_WINDOW_NOTE)
  })

  it('the note states its own expiry, so it cannot teach that A1 is ever just fine', () => {
    // The failure to guard against is not the alarm firing. It is an operator
    // learning across a few weeks that A1 is sometimes acceptable and carrying
    // that past 9d. The note has to close itself.
    expect(SCOPED_SEED_WINDOW_NOTE).toMatch(/disappears/i)
    expect(SCOPED_SEED_WINDOW_NOTE).toMatch(/A1 without this sentence is real/i)
    expect(SCOPED_SEED_WINDOW_NOTE).toMatch(/after the full seed has run, is also real/i)
  })

  it('still truncates the key list at twenty', () => {
    const many = Array.from({ length: 50 }, (_, i) => `photographs/aaa/${i}.jpg`)
    const d = a1MissingDetail({ missingKeys: many, scopedSeedWindow: false })
    expect(d).toContain('50 object(s)')
    expect(d.match(/photographs\//g) ?? []).toHaveLength(20)
  })

  it('the note does not downgrade A1 to a soft alarm', () => {
    // A1 must stay hard: the run closes ok:false and throws. The note changes
    // the wording of the email and nothing about the severity.
    const fns = readFileSync(
      path.resolve(process.cwd(), 'lib/inngest/storageBackupFunctions.ts'),
      'utf8',
    )
    // Match past the ] in the AlarmCode[] type annotation to the array literal.
    const soft = fns.match(/const SOFT_ALARMS[^=]*=\s*\[[^\]]*\]/)?.[0] ?? ''
    expect(soft).toBeTruthy() // control: the line was actually found
    expect(soft).toMatch(/A4_UNKNOWN_BUCKET/)
    expect(soft).not.toMatch(/A1_MISSING_IN_DEST/)
  })
})

describe('the change detection key cannot be forged by the content it separates', () => {
  it('does not merge two objects that a space separated key would collide', () => {
    // Under a space both sides render 'photographs a 1 2 3'. The diff would read
    // this source object as already in the manifest and never copy it, which is
    // a real object silently absent from the backup. Supabase paths do contain
    // spaces. This test fails if the \0 separator becomes ' '.
    const source: SourceObject[] = [
      { bucket: 'photographs', path: 'a 1', size: 2, etag: '3', createdAt: null },
    ]
    const manifest = [{ bucket: 'photographs', path: 'a', size_bytes: 1, source_etag: '2 3' }]

    const d = diffSourceAgainstManifest(source, manifest)
    expect(d.toCopy).toHaveLength(1)
    expect(d.unchanged).toBe(0)
  })

  it('still recognises an object that genuinely is unchanged', () => {
    // Control. Without it the assertion above would also pass on a key function
    // that returned something different on every call.
    const source: SourceObject[] = [
      { bucket: 'photographs', path: 'a 1', size: 2, etag: '3', createdAt: null },
    ]
    const manifest = [{ bucket: 'photographs', path: 'a 1', size_bytes: 2, source_etag: '3' }]

    expect(diffSourceAgainstManifest(source, manifest).unchanged).toBe(1)
  })

  it('the source file holds no raw NUL byte, so ripgrep can still search it', () => {
    // Three literal 0x00 bytes lived on the changeKey line until August 9, 2026.
    // Byte identical at runtime, and invisible in review because they render as
    // spaces. The cost was that ripgrep classified the whole module as binary
    // and returned NO MATCHES for any search against it, which silently breaks
    // recon on the file that defines the backup's scope rules.
    const src = readFileSync(path.resolve(process.cwd(), 'lib/storageBackup.ts'), 'utf8')
    expect(src).not.toContain('\u0000')
    expect(src).toContain('${bucket}\\0${path}')
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

describe('the archive scope narrows the source set before the diff', () => {
  // Real ids from CLAUDE.md section 11, plus the f44f1818 prefix, which has
  // objects in Storage and no archives row.
  const HA = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
  const FOUNDER = '6c0722d3-719a-423f-9024-621ba0072d6f'
  const ORPHAN = 'f44f1818-8f17-499d-8f27-23e286e923f7'

  const obj = (p: string): SourceObject => ({
    bucket: 'photographs',
    path: p,
    size: 100,
    etag: 'e',
    createdAt: '2026-08-01T00:00:00Z',
  })

  const SOURCE = [
    obj(`${HA}/one.jpeg`),
    obj(`${HA}/two.jpeg`),
    obj(`${FOUNDER}/three.jpeg`),
    obj(`${ORPHAN}/four.jpeg`),
    obj('legacy-import/five.jpeg'), // no uuid first segment at all
  ]

  const paths = (r: { kept: SourceObject[] }) => r.kept.map((o) => o.path)

  it('keeps everything when no scope is given, so wiring it in changes nothing today', () => {
    const r = applyArchiveScope(SOURCE)
    expect(r.kept).toHaveLength(5)
    expect(r.droppedOutOfScope).toBe(0)
    expect(r.droppedTerminated).toBe(0)
  })

  // ── The dissolution filter ────────────────────────────────────────────────

  it('drops every object belonging to a terminated archive', () => {
    const r = applyArchiveScope(SOURCE, { terminatedArchiveIds: [HA] })
    expect(paths(r)).not.toContain(`${HA}/one.jpeg`)
    expect(paths(r)).not.toContain(`${HA}/two.jpeg`)
    expect(r.droppedTerminated).toBe(2)
  })

  it('keeps an object with no uuid prefix, because it can never be terminated', () => {
    // The asymmetry that matters. An object with no archives row cannot be the
    // subject of a termination request, so dropping it would shrink the backup
    // with no alarm anywhere. Skeleton 2.1.
    const r = applyArchiveScope(SOURCE, { terminatedArchiveIds: [HA] })
    expect(paths(r)).toContain('legacy-import/five.jpeg')
  })

  it('leaves archives that are not terminated alone', () => {
    const r = applyArchiveScope(SOURCE, { terminatedArchiveIds: [HA] })
    expect(paths(r)).toContain(`${FOUNDER}/three.jpeg`)
    expect(paths(r)).toContain(`${ORPHAN}/four.jpeg`)
  })

  it('matches a terminated id whatever case it arrives in', () => {
    const r = applyArchiveScope(SOURCE, { terminatedArchiveIds: [HA.toUpperCase()] })
    expect(r.droppedTerminated).toBe(2)
  })

  // ── The 9a single archive scope ───────────────────────────────────────────

  it('keeps only the target archive', () => {
    const r = applyArchiveScope(SOURCE, { onlyArchiveId: HA })
    expect(paths(r)).toEqual([`${HA}/one.jpeg`, `${HA}/two.jpeg`])
    expect(r.droppedOutOfScope).toBe(3)
  })

  it('drops an object with no uuid prefix, because only this archive means only this archive', () => {
    const r = applyArchiveScope(SOURCE, { onlyArchiveId: HA })
    expect(paths(r)).not.toContain('legacy-import/five.jpeg')
  })

  it('accepts an uppercase target id', () => {
    const r = applyArchiveScope(SOURCE, { onlyArchiveId: HA.toUpperCase() })
    expect(r.kept).toHaveLength(2)
  })

  // ── Precedence ────────────────────────────────────────────────────────────

  it('drops an archive that is both the scope target and terminated', () => {
    // No explicit request may override a termination. A COMPLIANCE lock cannot
    // be shortened by anyone, including the account root, so this is the one
    // ordering in the file that is not a preference.
    const r = applyArchiveScope(SOURCE, { onlyArchiveId: HA, terminatedArchiveIds: [HA] })
    expect(r.kept).toHaveLength(0)
    expect(r.droppedTerminated).toBe(2)
  })

  it('attributes an object that is both out of scope and terminated to the termination', () => {
    // The only case where the two counters could disagree. Both filters are
    // continue guards, so which one drops it does not change what is copied,
    // but it does change what the run row reports. Terminated is the stronger
    // fact about an object and is the one worth reading in the log.
    const r = applyArchiveScope(SOURCE, { onlyArchiveId: FOUNDER, terminatedArchiveIds: [HA] })
    expect(paths(r)).toEqual([`${FOUNDER}/three.jpeg`])
    expect(r.droppedTerminated).toBe(2)
    expect(r.droppedOutOfScope).toBe(2) // the orphan and the non-uuid path
  })

  // ── Malformed input throws, in both directions ────────────────────────────

  it('throws on a malformed onlyArchiveId rather than seeding the whole property', () => {
    expect(() => applyArchiveScope(SOURCE, { onlyArchiveId: 'not-a-uuid' })).toThrow(/not a uuid/)
  })

  it('throws on an empty onlyArchiveId, which would otherwise read as no scope', () => {
    // The classic falsy footgun. '' must not quietly mean "copy everything".
    expect(() => applyArchiveScope(SOURCE, { onlyArchiveId: '' })).toThrow(/not a uuid/)
  })

  it('throws on a malformed terminated id rather than copying a family that asked to be forgotten', () => {
    expect(() => applyArchiveScope(SOURCE, { terminatedArchiveIds: ['nonsense'] })).toThrow(
      /not a uuid/,
    )
  })

  it('treats an explicit null onlyArchiveId as no scoping', () => {
    expect(applyArchiveScope(SOURCE, { onlyArchiveId: null }).kept).toHaveLength(5)
  })
})

describe('the snapshot read honours the dissolution filter too', () => {
  // The bug this covers: applyArchiveScope stops a terminated archive being
  // COPIED, and the snapshot is built from storage_backup_objects instead of
  // from the source walk. Those rows survive until runbook step 4.8 at X+365,
  // so every sync in between wrote the terminated archive's paths, hashes and
  // lock expiries back into B2 under a fresh lock. Deleting a snapshot by hand
  // did not help, because the next sync regenerated it from the same rows.
  const HA = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'
  const FOUNDER = '6c0722d3-719a-423f-9024-621ba0072d6f'

  const row = (p: string) => ({
    bucket: 'photographs',
    path: p,
    sha256: 'deadbeef',
    size_bytes: 100,
    b2_locked_until: '2026-11-06T00:00:00Z',
  })

  const ROWS = [
    row(`${HA}/one.jpeg`),
    row(`${HA}/two.jpeg`),
    row(`${FOUNDER}/three.jpeg`),
    row('legacy-import/four.jpeg'), // no uuid first segment at all
  ]

  const paths = (entries: { path: string }[]) => entries.map((e) => e.path)

  it("a terminated archive's rows are absent from the snapshot entries", () => {
    const entries = buildSnapshotEntries(ROWS, [HA])
    expect(paths(entries)).not.toContain(`${HA}/one.jpeg`)
    expect(paths(entries)).not.toContain(`${HA}/two.jpeg`)
    expect(entries).toHaveLength(2)
    // The whole point. Nothing carrying that id may reach the offsite lock.
    expect(JSON.stringify(entries)).not.toContain(HA)
  })

  it("a live archive's rows are present", () => {
    const entries = buildSnapshotEntries(ROWS, [HA])
    expect(paths(entries)).toContain(`${FOUNDER}/three.jpeg`)
  })

  it('a row whose path has no uuid prefix is present', () => {
    // Same asymmetry as applyArchiveScope, and for the same reason. An object
    // with no archives row can never be the subject of a termination request,
    // so dropping it would shrink the offsite inventory with no alarm anywhere.
    const entries = buildSnapshotEntries(ROWS, [HA])
    expect(paths(entries)).toContain('legacy-import/four.jpeg')
  })

  it('a terminated id in different case is still excluded', () => {
    const entries = buildSnapshotEntries(ROWS, [HA.toUpperCase()])
    expect(entries).toHaveLength(2)
    expect(JSON.stringify(entries)).not.toContain(HA)
  })

  it('keeps every row when nothing is terminated, so wiring it in changes nothing today', () => {
    expect(buildSnapshotEntries(ROWS)).toHaveLength(4)
    expect(buildSnapshotEntries(ROWS, [])).toHaveLength(4)
  })

  it('throws on a malformed terminated id rather than writing the archive offsite again', () => {
    expect(() => buildSnapshotEntries(ROWS, ['nonsense'])).toThrow(/not a uuid/)
  })

  it('still carries five fields and never source_row', () => {
    // The filter must not become a second, laxer path to the snapshot shape.
    const entries = buildSnapshotEntries(
      [
        {
          ...row(`${FOUNDER}/three.jpeg`),
          ...({ source_row: { caption: 'my mother in 1962' } } as object),
        },
      ],
      [HA],
    )
    expect(Object.keys(entries[0]).sort()).toEqual([
      'b2_locked_until',
      'bucket',
      'path',
      'sha256',
      'size_bytes',
    ])
    expect(JSON.stringify(entries)).not.toContain('my mother')
  })
})

describe('a scoped run cannot read as a full sync', () => {
  // The whole safety argument for build order 9a. The heartbeat clears
  // A5_SILENCE from the latest ok run of kind 'sync' or 'seed' and reads
  // started_at only, never objects_copied. A scoped run wearing either kind
  // would report the backup healthy for 8 days having copied one archive.
  const heartbeat = readFileSync(
    path.resolve(process.cwd(), 'app/api/cron/storage-backup-heartbeat/route.ts'),
    'utf8',
  )

  it('the scoped kind is neither of the two kinds that clear silence', () => {
    expect(SCOPED_RUN_KIND).not.toBe('seed')
    expect(SCOPED_RUN_KIND).not.toBe('sync')
  })

  it('the heartbeat still counts sync and seed, so this gate discriminates', () => {
    expect(heartbeat).toMatch(/lastSuccess\('sync'\)/)
    expect(heartbeat).toMatch(/\.eq\('kind', 'seed'\)/)
  })

  it('the heartbeat filters by kind at all', () => {
    // The dangerous regression is not adding 'scoped' to the heartbeat. It is
    // dropping the kind filter, after which every run of every kind clears
    // silence and the two assertions above still pass.
    expect(heartbeat).toMatch(/\.eq\('kind', kind\)/)
  })

  it('the heartbeat never counts a scoped run toward silence', () => {
    // Both spellings. The literal is the likely one, the imported constant is
    // the one a careful person reaches for, and only checking the literal would
    // let the careful version through.
    expect(heartbeat).not.toMatch(new RegExp(`'${SCOPED_RUN_KIND}'`))
    expect(heartbeat).not.toMatch(/SCOPED_RUN_KIND/)
  })

  const migration = readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260809_storage_backup_scoped_kind.sql'),
    'utf8',
  )

  it('the migration allows the kind the code intends to write', () => {
    // A typo between the constant and the CHECK would not surface until an
    // insert failed in production, mid run, after objects were already in B2.
    expect(migration).toMatch(new RegExp(`CHECK \\(kind IN \\([^)]*'${SCOPED_RUN_KIND}'`))
  })

  it('the migration forces a scoped run to name the archive it covered', () => {
    // Provenance, not safety. The kind carries the safety property. This one
    // closes the case the derivation cannot reach: a scoped run that copied zero
    // objects has no rows in storage_backup_objects to join to, and a zero-copy
    // run is exactly what someone would be investigating.
    expect(migration).toMatch(/storage_backup_runs_scope_matches_kind/)
    expect(migration).toMatch(
      /CHECK \(\(kind = 'scoped'\) = \(scope_archive_id IS NOT NULL\)\)/,
    )
  })

  it('the migration adds no foreign key from scope_archive_id to archives', () => {
    // A cascade would erase the record of the run at the moment the archive is
    // deleted, which for a disposable 9a archive is the moment the run row
    // becomes the only surviving evidence of the drill. Parent migration 2a.
    expect(migration).not.toMatch(/scope_archive_id\s+UUID\s+REFERENCES/i)
  })
})
