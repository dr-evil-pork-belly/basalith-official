/**
 * Archive export builder.
 *
 * Produces a self-contained zip holding the family's actual bytes, not links.
 * Used by the Inngest job in lib/inngest/exportFunctions.ts and driven directly
 * by scripts/export-probe.ts.
 *
 * THE CONTRACT THIS FILE EXISTS TO ENFORCE
 *
 * The route this replaces wrapped eight queries in Promise.allSettled and read
 * `r.value.data ?? []`. A Supabase error arrives as a FULFILLED promise carrying
 * {data: null, error}, so every failed query became a valid, well formed, empty
 * JSON file with nothing logged. training-pairs.json shipped [] on every export
 * ever run, across 154 rows on four archives, because the query selected a
 * column that does not exist.
 *
 * Here, an empty array in the output means the table was genuinely empty. Any
 * query error throws ExportQueryError, which aborts the job before a single file
 * is written. There is no path through this file that turns a failure into an
 * empty file.
 *
 * Every column selected below was verified against the live schema on
 * August 3, 2026 before the query was written. See docs/EXPORT_ROUTE_RECON_2026-08.md.
 */
import JSZip from 'jszip'
import { createHash } from 'node:crypto'

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryFailure {
  table:   string
  message: string
}

/**
 * Thrown when any table query fails. Carries every failure, not just the first,
 * so one run names the whole problem instead of one round trip per broken column.
 */
export class ExportQueryError extends Error {
  readonly failures: QueryFailure[]
  constructor(failures: QueryFailure[]) {
    super(
      `Archive export aborted. ${failures.length} quer${failures.length === 1 ? 'y' : 'ies'} failed: ` +
      failures.map(f => `${f.table} (${f.message})`).join('; '),
    )
    this.name = 'ExportQueryError'
    this.failures = failures
  }
}

export interface MediaFailure {
  table:       string
  bucket:      string
  storagePath: string
  message:     string
}

/**
 * Thrown when a file the database records cannot be read out of Storage.
 *
 * This is fatal for the same reason a query error is fatal. The README inside
 * every export tells the family:
 *
 *     "If any part of this export could not be read, no zip is produced at all
 *      and we contact you instead."
 *
 * An earlier version of this builder recorded the miss in the manifest and
 * shipped the zip anyway, which made that sentence false: a family whose
 * photograph failed to download received an export plus a promise that it could
 * not have happened. The sentence is the correct behavior. This error is what
 * makes it true.
 *
 * Note what is NOT fatal: a twilio: or pending/ pseudo-path, and a duplicate row
 * pointing at a file already included. Those are not files that "could not be
 * read". They are files that were never stored, or already present. Both stay in
 * the manifest's `excluded` list and both still produce a zip.
 */
export class ExportMediaError extends Error {
  readonly failures: MediaFailure[]
  constructor(failures: MediaFailure[]) {
    super(
      `Archive export aborted. ${failures.length} file${failures.length === 1 ? '' : 's'} recorded in the database could not be read from Storage: ` +
      failures.map(f => `${f.bucket}/${f.storagePath} via ${f.table} (${f.message})`).join('; '),
    )
    this.name = 'ExportMediaError'
    this.failures = failures
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest shape
// ─────────────────────────────────────────────────────────────────────────────

export interface ManifestFile {
  zipPath:      string
  bucket:       string
  storagePath:  string
  sourceTable:  string
  sourceColumn: string
  bytes:        number
  sha256:       string
}

export interface ManifestExclusion {
  sourceTable: string
  rowId:       string | null
  value:       string | null
  reason:      string
}

export interface ExportManifest {
  archiveId:      string
  archiveName:    string
  generatedAt:    string
  formatVersion:  number
  tables:         { name: string; file: string; rowCount: number }[]
  media:          ManifestFile[]
  excluded:       ManifestExclusion[]
  notIncluded:    { name: string; reason: string }[]
  totals:         { mediaFiles: number; mediaBytes: number; tableRows: number }
}

export interface ExportResult {
  zip:       Buffer
  manifest:  ExportManifest
  archive:   { id: string; name: string; ownerName: string | null; ownerEmail: string | null; preferredLanguage: string }
}

// Minimal structural types. Avoids importing SupabaseClient generics, which
// would drag the whole Database type in for no benefit, and keeps this file
// callable with the sabotaged stub scripts/export-probe.ts injects for gate 3.
export type Row = Record<string, unknown>

interface SupaResult<T> {
  data:  T | null
  error: { message: string } | null
}

export interface QueryBuilder extends PromiseLike<SupaResult<Row[]>> {
  select(columns: string):            QueryBuilder
  eq(column: string, value: unknown): QueryBuilder
  order(column: string):              QueryBuilder
  limit(n: number):                   QueryBuilder
  maybeSingle():                      Promise<SupaResult<Row>>
}

export interface Queryable {
  from(table: string): QueryBuilder
  storage: {
    from(bucket: string): { download(path: string): Promise<SupaResult<Blob>> }
  }
}

/** Narrow an unknown cell to a string, or null. Row values are all `unknown`. */
function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Table plan. Every column verified live before this list was written.
// ─────────────────────────────────────────────────────────────────────────────

interface TablePlan {
  table:   string
  file:    string
  columns: string
  order?:  string
  limit?:  number
  extra?:  (q: QueryBuilder) => QueryBuilder
}

const TABLES: TablePlan[] = [
  {
    table:   'owner_deposits',
    file:    'data/deposits.json',
    columns: 'id, prompt, response, created_at, source_type, essence_status, contributor_id, photograph_id',
    order:   'created_at',
  },
  {
    // WAS BROKEN: selected `dimension`, which does not exist on this table.
    // Dimension tags live inside the `metadata` jsonb. 154 rows across four
    // archives shipped as [] because of this.
    table:   'training_pairs',
    file:    'data/training-pairs.json',
    columns: 'id, prompt, completion, quality_score, specificity_score, authenticity_score, trainability_score, included_in_training, source_type, source_id, language, word_count, metadata, created_at',
    order:   'created_at',
  },
  {
    table:   'voice_recordings',
    file:    'data/voice-recordings.json',
    columns: 'id, storage_path, prompt, transcript, duration_seconds, created_at, transcript_status, language_detected, mime_type, file_size',
    order:   'created_at',
  },
  {
    table:   'photographs',
    file:    'data/photographs.json',
    columns: 'id, storage_path, original_name, ai_era_estimate, status, created_at, file_size, width, height, labels(what_was_happening, labelled_by, year_taken, location)',
    order:   'created_at',
  },
  {
    table:   'contributors',
    file:    'data/contributors.json',
    columns: 'name, relationship, status, created_at',
  },
  {
    // WAS BROKEN: selected `label`, which does not exist. The live table has
    // person_name. Migration 20260512_retention_mechanics.sql claims to add
    // `label` and `notify_annually`. Neither is live.
    table:   'significant_dates',
    file:    'data/significant-dates.json',
    columns: 'id, person_name, date_type, month, day, year, notes, active',
    extra:   (q) => q.eq('active', true),
    order:   'year',
  },
  {
    table:   'entity_conversations',
    file:    'data/entity-conversations.json',
    columns: 'role, content, created_at, session_id',
    order:   'created_at',
  },
  {
    table:   'archive_videos',
    file:    'data/videos.json',
    columns: 'id, storage_path, file_name, file_type, video_type, title, summary, transcript, duration_seconds, created_at, file_size, approximate_decade',
    order:   'created_at',
  },
  {
    table:   'archive_documents',
    file:    'data/documents.json',
    columns: 'id, storage_path, file_name, file_type, title, summary, file_size, created_at',
    order:   'created_at',
  },
  {
    table:   'voice_portraits',
    file:    'data/voice-portraits.json',
    columns: 'id, audio_path, script_text, duration_seconds, month, created_at',
    order:   'created_at',
  },
]

/**
 * Media sources. The path is READ from a column on every one of these. Nothing
 * here constructs a path from an id and a guessed extension, which is how the
 * previous route produced a null link on 316/316 photographs and 33/33
 * recordings.
 *
 * voice_portraits is the trap: it uses `audio_path`, every other table uses
 * `storage_path`. Its rows also duplicate (9 rows point at 4 distinct files
 * property wide), so paths are deduplicated below.
 *
 * vault_files is deliberately absent. `vaults` keys on archivist_id and has no
 * archive_id column, so those are Legacy Guide files. Including them in an
 * archive owner's export would be a data exposure, not a fix.
 */
interface MediaSource {
  table:      string
  column:     string
  bucket:     string
  folder:     string
  nameColumn: string | null
}

const MEDIA: MediaSource[] = [
  { table: 'photographs',      column: 'storage_path', bucket: 'photographs',      folder: 'photographs',     nameColumn: 'original_name' },
  { table: 'voice_recordings', column: 'storage_path', bucket: 'voice-recordings', folder: 'voice-recordings', nameColumn: null },
  { table: 'voice_portraits',  column: 'audio_path',   bucket: 'voice-recordings', folder: 'voice-portraits',  nameColumn: null },
  { table: 'archive_videos',   column: 'storage_path', bucket: 'archive-videos',   folder: 'videos',           nameColumn: 'file_name' },
  { table: 'archive_documents', column: 'storage_path', bucket: 'archive-documents', folder: 'documents',      nameColumn: 'file_name' },
]

/** Tables that exist on the archive and are deliberately not in the zip. */
const NOT_INCLUDED = [
  { name: 'vault_files',           reason: 'Legacy Guide vault storage. Keyed to a Guide, not to this archive.' },
  { name: 'mirror_reflections',    reason: 'Internal reflection drafts. Not part of the exported record in this version.' },
  { name: 'incident_sessions',     reason: 'Internal session state for the interview engine.' },
  { name: 'deposit_domain_scores', reason: 'Internal scoring derived from deposits already included in full.' },
  { name: 'successors',            reason: 'Contains credentials. Never exported.' },
  { name: 'archive_lifecycle',     reason: 'Internal billing and lifecycle state.' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** A storage_path value that is not a Storage object path. Skipped and named. */
function pseudoPathReason(p: string | null): string | null {
  if (!p || !p.trim()) return 'No storage path recorded on the row.'
  if (p.startsWith('twilio:')) {
    return 'Recorded on the telephone line. The audio stayed with the telephony provider and was never copied into Basalith storage, so there is no file for us to include.'
  }
  if (p.startsWith('pending/')) {
    return 'An upload that never completed. No file was stored.'
  }
  return null
}

function safeName(raw: string | null, fallback: string): string {
  const base = (raw ?? '').trim() || fallback
  const cleaned = base.replace(/[\\/]/g, '_').replace(/[^A-Za-z0-9._-]/g, '_').replace(/_+/g, '_')
  return cleaned.slice(0, 80) || fallback
}

function basename(p: string): string {
  const parts = p.split('/')
  return parts[parts.length - 1] || p
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// The builder
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildOptions {
  /** Concurrency for Storage downloads. */
  concurrency?: number
  /** Injected clock, so the probe can pin a timestamp. */
  now?: Date
  /** Progress callback for the probe and for Inngest step logging. */
  onProgress?: (message: string) => void
}

export async function buildArchiveExport(
  supabase: Queryable,
  archiveId: string,
  opts: BuildOptions = {},
): Promise<ExportResult> {
  const now = opts.now ?? new Date()
  const log = opts.onProgress ?? (() => {})

  // ── 1. Archive row. A missing archive is fatal, never an empty file. ───────
  const { data: archive, error: archiveErr } = await supabase
    .from('archives')
    .select('id, name, owner_name, owner_email, family_name, created_at, tier, preferred_language, status')
    .eq('id', archiveId)
    .maybeSingle()

  if (archiveErr) throw new ExportQueryError([{ table: 'archives', message: archiveErr.message }])
  if (!archive)   throw new ExportQueryError([{ table: 'archives', message: `No archive row for id ${archiveId}` }])

  // Row values arrive as `unknown`. Narrow once here rather than casting at
  // each use, so a column that stops being a string fails in one place.
  const info = {
    id:        str(archive.id) ?? archiveId,
    name:      str(archive.name) ?? 'Your archive',
    ownerName: str(archive.owner_name),
    ownerEmail: str(archive.owner_email),
    familyName: str(archive.family_name),
    createdAt: str(archive.created_at),
    tier:      str(archive.tier),
    status:    str(archive.status),
    language:  str(archive.preferred_language) ?? 'en',
  }

  // ── 2. Every table query. Errors are collected and thrown, never swallowed. ─
  log(`Querying ${TABLES.length} tables`)

  const settled = await Promise.allSettled(
    TABLES.map(async (plan) => {
      let q = supabase.from(plan.table).select(plan.columns).eq('archive_id', archiveId)
      if (plan.extra) q = plan.extra(q)
      if (plan.order) q = q.order(plan.order)
      if (plan.limit) q = q.limit(plan.limit)
      const { data, error } = await q
      // THE FIX. A Supabase error arrives here as a fulfilled promise. Rejecting
      // is what stops it from becoming `?? []` further down.
      if (error) throw new Error(error.message)
      return { plan, rows: data ?? [] }
    }),
  )

  const failures: QueryFailure[] = []
  const results: { plan: TablePlan; rows: Row[] }[] = []

  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      failures.push({ table: TABLES[i].table, message: r.reason?.message ?? String(r.reason) })
    } else {
      results.push(r.value)
    }
  })

  if (failures.length) throw new ExportQueryError(failures)

  const byTable = new Map(results.map(r => [r.plan.table, r.rows]))
  log(`All ${TABLES.length} table queries succeeded`)

  // ── 3. Resolve media. Paths are read from columns, never constructed. ──────
  const excluded: ManifestExclusion[] = []
  const wanted: { source: MediaSource; storagePath: string; zipName: string }[] = []
  const seenPaths = new Set<string>()

  for (const source of MEDIA) {
    const rows = byTable.get(source.table) ?? []
    let ordinal = 0
    for (const row of rows) {
      const raw   = str(row[source.column])
      const rowId = str(row.id)

      const reason = pseudoPathReason(raw)
      if (reason) {
        excluded.push({ sourceTable: source.table, rowId, value: raw, reason })
        continue
      }
      const storagePath = raw as string

      // voice_portraits duplicates heavily: 9 rows, 4 files property wide.
      // A duplicate name in a zip silently overwrites, which is the same class
      // of silent loss this rebuild exists to remove.
      const dedupeKey = `${source.bucket}::${storagePath}`
      if (seenPaths.has(dedupeKey)) {
        excluded.push({
          sourceTable: source.table,
          rowId,
          value:       storagePath,
          reason:      'Duplicate row pointing at a file already included once in this export.',
        })
        continue
      }
      seenPaths.add(dedupeKey)

      ordinal += 1
      const fallback = basename(storagePath)
      const named    = source.nameColumn ? str(row[source.nameColumn]) : null
      const zipName  = `${source.folder}/${String(ordinal).padStart(4, '0')}-${safeName(named, fallback)}`
      wanted.push({ source, storagePath, zipName })
    }
  }

  log(`Resolved ${wanted.length} media objects, ${excluded.length} excluded`)

  // ── 4. Download. A file the database records but Storage cannot return is
  //       FATAL, exactly like a query error. See ExportMediaError. ───────────
  const downloaded = await pool(wanted, opts.concurrency ?? 8, async (item) => {
    const { data, error } = await supabase.storage.from(item.source.bucket).download(item.storagePath)
    if (error || !data) {
      return { item, buffer: null, error: error?.message ?? 'Storage returned no data' }
    }
    return { item, buffer: Buffer.from(await data.arrayBuffer()), error: null as string | null }
  })

  // Collect every miss before throwing, so one run names the whole problem
  // rather than one round trip per broken object.
  const mediaFailures: MediaFailure[] = downloaded
    .filter(d => !d.buffer)
    .map(d => ({
      table:       d.item.source.table,
      bucket:      d.item.source.bucket,
      storagePath: d.item.storagePath,
      message:     d.error ?? 'unknown',
    }))

  if (mediaFailures.length) throw new ExportMediaError(mediaFailures)

  const zip  = new JSZip()
  const root = zip.folder('basalith-export')!
  const media: ManifestFile[] = []

  for (const d of downloaded) {
    // Unreachable: mediaFailures threw above. Kept as a type narrow, not a branch.
    if (!d.buffer) continue
    root.file(d.item.zipName, d.buffer)
    media.push({
      zipPath:      d.item.zipName,
      bucket:       d.item.source.bucket,
      storagePath:  d.item.storagePath,
      sourceTable:  d.item.source.table,
      sourceColumn: d.item.source.column,
      bytes:        d.buffer.length,
      sha256:       createHash('sha256').update(d.buffer).digest('hex'),
    })
  }

  const mediaBytes = media.reduce((s, m) => s + m.bytes, 0)
  log(`Downloaded ${media.length} objects, ${(mediaBytes / 1024 / 1024).toFixed(2)} MB`)

  // ── 5. JSON files. An empty array here means the table was empty. ──────────
  const tables = results.map(({ plan, rows }) => {
    root.file(plan.file, JSON.stringify(rows, null, 2))
    return { name: plan.table, file: plan.file, rowCount: rows.length }
  })

  root.file('archive-info.json', JSON.stringify({
    id:                info.id,
    name:              info.name,
    owner:             info.ownerName,
    family:            info.familyName,
    created:           info.createdAt,
    tier:              info.tier,
    status:            info.status,
    preferredLanguage: info.language,
    exportedAt:        now.toISOString(),
  }, null, 2))

  const manifest: ExportManifest = {
    archiveId:     info.id,
    archiveName:   info.name,
    generatedAt:   now.toISOString(),
    formatVersion: 1,
    tables,
    media,
    excluded,
    notIncluded:   NOT_INCLUDED,
    totals: {
      mediaFiles: media.length,
      mediaBytes,
      tableRows:  tables.reduce((s, t) => s + t.rowCount, 0),
    },
  }

  root.file('MANIFEST.json', JSON.stringify(manifest, null, 2))
  root.file('README.txt', buildReadme(manifest, info.name, now))

  // ── 6. STORE, never DEFLATE. Measured: level 6 gives 99.7% of original for
  //       20x the time, because 100% of these bytes are already compressed. ──
  log('Packing zip with STORE')
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })

  return {
    zip:      buffer,
    manifest,
    archive: {
      id:                info.id,
      name:              info.name,
      ownerName:         info.ownerName,
      ownerEmail:        info.ownerEmail,
      preferredLanguage: info.language,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// README
// ─────────────────────────────────────────────────────────────────────────────

export function buildReadme(manifest: ExportManifest, archiveName: string, now: Date): string {
  const mb = (b: number) => (b / 1024 / 1024).toFixed(2)
  const date = now.toISOString().substring(0, 10)

  const tableLines = manifest.tables
    .map(t => `  ${t.file.padEnd(34)}${t.rowCount} ${t.rowCount === 1 ? 'record' : 'records'}`)
    .join('\n')

  const mediaByFolder = new Map<string, { n: number; bytes: number }>()
  for (const m of manifest.media) {
    const folder = m.zipPath.split('/')[0]
    const rec = mediaByFolder.get(folder) ?? { n: 0, bytes: 0 }
    rec.n += 1
    rec.bytes += m.bytes
    mediaByFolder.set(folder, rec)
  }
  const mediaLines = mediaByFolder.size
    ? [...mediaByFolder.entries()]
        .map(([f, v]) => `  ${(f + '/').padEnd(34)}${v.n} ${v.n === 1 ? 'file' : 'files'}, ${mb(v.bytes)} MB`)
        .join('\n')
    : '  (no photographs, recordings, or video are stored for this archive)'

  const exclusionLines = manifest.excluded.length
    ? manifest.excluded.map(e => `  ${e.value ?? '(no path)'}\n      from ${e.sourceTable}. ${e.reason}`).join('\n')
    : '  Nothing. Every file recorded for this archive is in this export.'

  const totalFiles = manifest.totals.mediaFiles

  const notIncludedLines = manifest.notIncluded
    .map(n => `  ${n.name.padEnd(24)}${n.reason}`)
    .join('\n')

  return `BASALITH ARCHIVE EXPORT
${archiveName}
Generated ${date}

WHAT THIS IS

This is everything recorded in your archive. The actual files, not links to
them. Everything listed below is inside this zip and stays readable with no
connection to Basalith and no account. You can copy it, store it, and open it
in twenty years.

Recorded means every photograph, recording, video, document, and written
record that Basalith holds a record of for this archive. The counts below are
that record, item for item. MANIFEST.json lists every file in this zip and
names anything excluded and the reason.

The formats are open. JSON is plain text and opens in any text editor. The
photographs, recordings, and video are in the same formats they were uploaded
in, and open in any standard viewer or player.

YOUR RECORDS

${tableLines}

An entry showing 0 records means that table holds nothing for your archive. It
does not mean something failed. If any part of this export could not be read,
no zip is produced at all and we contact you instead.

YOUR FILES

${mediaLines}

  Total ${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}, ${mb(manifest.totals.mediaBytes)} MB

That total is every file recorded for this archive, less anything named under
NOT INCLUDED below.

File names are numbered so that nothing overwrites anything else. MANIFEST.json
maps every file in this zip back to its original record, and carries a SHA-256
checksum for each one so you can verify nothing changed in transit.

NOT INCLUDED, AND WHY

${exclusionLines}

The following are held by Basalith but are not part of an archive export:

${notIncludedLines}

ABOUT YOUR TRAINING PAIRS

data/training-pairs.json holds the prompt and completion pairs built from your
deposits. They are plain JSON and can be used to fine tune any compatible
language model. This file was empty on every export produced before August 2026
because of a defect on our side. It is correct now, and the record count above
is the real one.

WHAT YOU CAN DO WITH THIS

Keep it. Copy it to another drive. Give it to your family or your attorney.
You own your archive. Heritage Nexus Inc. is the custodian, not the owner.
Nothing in this zip stops working if Basalith does.

You can request another export at any time. There is no limit and no reason
required.

Questions about your archive: hello@basalith.xyz
Security concerns: security@basalith.ai

Heritage Nexus Inc.
`
}
