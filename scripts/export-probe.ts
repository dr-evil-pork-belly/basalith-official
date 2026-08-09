/**
 * Regression gate for the archive export rebuild.
 *
 * The defect this gate exists to prevent regressing: the previous route wrapped
 * eight queries in Promise.allSettled and read `r.value.data ?? []`. A Supabase
 * error arrives as a FULFILLED promise, so every failed query became a valid,
 * well formed, EMPTY JSON file with nothing logged. training-pairs.json shipped
 * [] on every export ever run because it selected a column that does not exist.
 *
 * Gate 3 is therefore the important one. It injects a query error and asserts
 * the build throws rather than producing a zip. If gate 3 ever passes by
 * emitting a file, the rebuild has regressed to the original defect.
 *
 * Usage:
 *   npx tsx scripts/export-probe.ts              build + verify, no writes
 *   npx tsx scripts/export-probe.ts --upload     also upload, sign, verify expiry
 *   npx tsx scripts/export-probe.ts --upload --send   also send the real email
 *
 * --send delivers to archives.owner_email. Confirm whose address that is before
 * using it.
 */
import './load-env'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { buildArchiveExport, ExportQueryError, ExportMediaError } from '../lib/archiveExport'
import {
  EXPORT_BUCKET,
  RETENTION_SECONDS,
  exportObjectPath,
  expiresAt,
  formatExpiry,
  signedUrlExpiry,
} from '../lib/archiveExportStorage'
import {
  buildExportReadyEmail,
  buildExportReadySubject,
} from '../lib/emails/archiveExport'

const ARCHIVE_ID = process.env.PROBE_ARCHIVE_ID ?? 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'

// Recon baseline for Dr Ha, docs/EXPORT_ROUTE_RECON_2026-08.md section 1.
const EXPECTED_OBJECTS = 72
const EXPECTED_MB      = 196.14

const DO_UPLOAD = process.argv.includes('--upload')
const DO_SEND   = process.argv.includes('--send')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const mb = (b: number) => (b / 1024 / 1024).toFixed(2)
const rule = (t: string) => console.log(`\n${'='.repeat(78)}\n${t}\n${'='.repeat(78)}`)

let failures = 0
function assert(label: string, cond: boolean, detail = '') {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? '  ' + detail : ''}`)
  if (!cond) failures += 1
}

async function main() {
  rule('GATE 1  REAL EXPORT RUN, Dr Ha archive a38e4503')

  const t0 = Date.now()
  const built = await buildArchiveExport(sb as never, ARCHIVE_ID, {
    onProgress: (m) => console.log(`  ${m}`),
  })
  const elapsed = Date.now() - t0
  const { zip, manifest } = built

  console.log(`\n  built in ${(elapsed / 1000).toFixed(1)} s`)
  console.log(`  zip bytes        : ${zip.length} (${mb(zip.length)} MB)`)
  console.log(`  media files      : ${manifest.totals.mediaFiles}`)
  console.log(`  media bytes      : ${manifest.totals.mediaBytes} (${mb(manifest.totals.mediaBytes)} MB)`)
  console.log(`  table rows total : ${manifest.totals.tableRows}`)

  console.log('\n  --- MANIFEST: tables ---')
  for (const t of manifest.tables) {
    console.log(`    ${t.name.padEnd(22)} ${String(t.rowCount).padStart(4)} rows   ${t.file}`)
  }

  console.log('\n  --- MANIFEST: media, grouped by source ---')
  const bySource = new Map<string, { n: number; bytes: number; bucket: string; column: string }>()
  for (const m of manifest.media) {
    const k = m.sourceTable
    const r = bySource.get(k) ?? { n: 0, bytes: 0, bucket: m.bucket, column: m.sourceColumn }
    r.n += 1; r.bytes += m.bytes
    bySource.set(k, r)
  }
  for (const [t, v] of bySource) {
    console.log(`    ${t.padEnd(20)} ${String(v.n).padStart(3)} files  ${mb(v.bytes).padStart(8)} MB   read from ${t}.${v.column} -> ${v.bucket}`)
  }

  console.log('\n  --- MANIFEST: excluded ---')
  if (!manifest.excluded.length) console.log('    (nothing)')
  for (const e of manifest.excluded) {
    console.log(`    ${e.sourceTable}  ${e.value}`)
    console.log(`        ${e.reason}`)
  }

  console.log('\n  --- first 5 media entries verbatim ---')
  for (const m of manifest.media.slice(0, 5)) {
    console.log(`    ${m.zipPath}`)
    console.log(`        bucket=${m.bucket} path=${m.storagePath}`)
    console.log(`        bytes=${m.bytes} sha256=${m.sha256}`)
  }

  console.log('')
  assert(
    `media file count matches recon (${EXPECTED_OBJECTS} objects)`,
    manifest.totals.mediaFiles === EXPECTED_OBJECTS,
    `got ${manifest.totals.mediaFiles}`,
  )
  assert(
    `media bytes match recon (${EXPECTED_MB} MB, tolerance 0.05)`,
    Math.abs(Number(mb(manifest.totals.mediaBytes)) - EXPECTED_MB) < 0.05,
    `got ${mb(manifest.totals.mediaBytes)} MB`,
  )
  assert('zip is at least as large as its media (STORE, no compression)', zip.length >= manifest.totals.mediaBytes)

  // ── Gate 2 ────────────────────────────────────────────────────────────────
  rule('GATE 2  training-pairs.json holds real rows, not []')

  const JSZip = (await import('jszip')).default
  const readBack = await JSZip.loadAsync(zip)
  const tpFile = readBack.file('basalith-export/data/training-pairs.json')
  const tpJson = JSON.parse(await tpFile!.async('string'))

  console.log(`  rows in data/training-pairs.json : ${tpJson.length}`)
  console.log(`  first row keys                   : ${Object.keys(tpJson[0] ?? {}).join(', ')}`)
  console.log(`  sample prompt                    : ${JSON.stringify(String(tpJson[0]?.prompt ?? '').slice(0, 90))}`)
  console.log(`  sample completion                : ${JSON.stringify(String(tpJson[0]?.completion ?? '').slice(0, 90))}`)

  const { count: tpLive } = await sb
    .from('training_pairs').select('*', { count: 'exact', head: true }).eq('archive_id', ARCHIVE_ID)

  assert('training-pairs.json is not empty', tpJson.length > 0, `got ${tpJson.length}`)
  assert('training-pairs.json row count equals the live table', tpJson.length === tpLive, `zip=${tpJson.length} live=${tpLive}`)

  // ── Gate 7 ────────────────────────────────────────────────────────────────
  rule('GATE 7  vault_files appears nowhere in the output')

  const allNames = Object.keys(readBack.files)
  let vaultHits = 0
  for (const name of allNames) {
    const f = readBack.files[name]
    if (f.dir) continue
    if (/vault/i.test(name)) { console.log(`    filename hit: ${name}`); vaultHits += 1 }
    if (name.endsWith('.json') || name.endsWith('.txt')) {
      const text = await f.async('string')
      // MANIFEST.json and README.txt name vault_files in the "not included"
      // list on purpose. That is a disclosure, not an inclusion.
      const isDisclosure = name.endsWith('MANIFEST.json') || name.endsWith('README.txt')
      if (/vault/i.test(text) && !isDisclosure) {
        console.log(`    content hit: ${name}`)
        vaultHits += 1
      }
    }
  }
  console.log(`  zip entries scanned : ${allNames.length}`)
  console.log(`  vault-files bucket referenced in manifest.media : ${manifest.media.some(m => m.bucket === 'vault-files')}`)
  console.log(`  vault_files listed in manifest.notIncluded      : ${manifest.notIncluded.some(n => n.name === 'vault_files')}`)
  assert('no vault file or vault content in the zip', vaultHits === 0, `${vaultHits} hits`)
  assert('vault_files is disclosed as deliberately excluded', manifest.notIncluded.some(n => n.name === 'vault_files'))

  // ── Gate 4 ────────────────────────────────────────────────────────────────
  rule('GATE 4  README.txt, verbatim')
  const readme = await readBack.file('basalith-export/README.txt')!.async('string')
  console.log(readme)
  assert('README does not claim 24 hour links', !/24 hours/i.test(readme))
  assert('README does not claim M4A', !/M4A/i.test(readme))
  assert('README contains no em dash', !readme.includes('—'))

  // ── Gate 3 ────────────────────────────────────────────────────────────────
  rule('GATE 3  INDUCED QUERY ERROR aborts the job, writes nothing')

  // Wrap the client so training_pairs returns the exact shape Supabase returns
  // for a bad column: a resolved promise carrying {data: null, error}. This is
  // the shape the old route turned into an empty file.
  const INDUCED = 'column training_pairs.dimension does not exist'
  const sabotaged = {
    ...sb,
    storage: sb.storage,
    from(table: string) {
      const real = (sb as never as { from: (t: string) => never }).from(table)
      if (table !== 'training_pairs') return real
      const failing: Record<string, unknown> = {}
      const pass = () => failing
      for (const m of ['select', 'eq', 'order', 'limit', 'not', 'is', 'in']) failing[m] = pass
      failing.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: INDUCED } }).then(res)
      failing.maybeSingle = async () => ({ data: null, error: { message: INDUCED } })
      failing.single      = async () => ({ data: null, error: { message: INDUCED } })
      return failing
    },
  }

  console.log(`  injecting on training_pairs: "${INDUCED}"`)
  let threw: unknown = null
  let produced: unknown = null
  try {
    produced = await buildArchiveExport(sabotaged as never, ARCHIVE_ID, { concurrency: 4 })
  } catch (e) {
    threw = e
  }

  console.log(`  build returned a zip      : ${produced ? 'YES (REGRESSION)' : 'no'}`)
  console.log(`  build threw               : ${threw ? 'yes' : 'NO (REGRESSION)'}`)
  if (threw instanceof ExportQueryError) {
    console.log(`  error type                : ExportQueryError`)
    console.log(`  failing tables named      : ${threw.failures.map(f => f.table).join(', ')}`)
    console.log(`  message                   : ${threw.message}`)
  } else if (threw) {
    console.log(`  error type                : ${(threw as Error).name} (expected ExportQueryError)`)
  }

  assert('an errored query aborts the build', threw !== null)
  assert('no zip is produced from an errored query', produced === null)
  assert('the error is an ExportQueryError', threw instanceof ExportQueryError)
  assert(
    'the failing table is named in the error',
    threw instanceof ExportQueryError && threw.failures.some(f => f.table === 'training_pairs'),
  )
  assert(
    'the underlying Supabase message is preserved',
    threw instanceof ExportQueryError && threw.failures.some(f => f.message === INDUCED),
  )

  // ── Gate 3b ───────────────────────────────────────────────────────────────
  rule('GATE 3b  INDUCED MEDIA DOWNLOAD FAILURE aborts the job, writes nothing')

  // The README inside every export promises: "If any part of this export could
  // not be read, no zip is produced at all and we contact you instead." An
  // earlier build recorded the miss in the manifest and shipped the zip anyway,
  // which made that sentence false. This gate is what keeps it true.
  const MISS = 'Object not found'
  const firstPath = manifest.media[0].storagePath
  const firstBucket = manifest.media[0].bucket

  const brokenStorage = {
    ...sb,
    from: (t: string) => (sb as never as { from: (x: string) => never }).from(t),
    storage: {
      from(bucket: string) {
        const real = sb.storage.from(bucket)
        return {
          ...real,
          download: async (p: string) => {
            if (bucket === firstBucket && p === firstPath) {
              return { data: null, error: { message: MISS } }
            }
            return real.download(p)
          },
        }
      },
    },
  }

  console.log(`  making one recorded object unreadable: ${firstBucket}/${firstPath}`)
  let mediaThrew: unknown = null
  let mediaProduced: unknown = null
  try {
    mediaProduced = await buildArchiveExport(brokenStorage as never, ARCHIVE_ID, { concurrency: 8 })
  } catch (e) {
    mediaThrew = e
  }

  console.log(`  build returned a zip      : ${mediaProduced ? 'YES (REGRESSION)' : 'no'}`)
  console.log(`  build threw               : ${mediaThrew ? 'yes' : 'NO (REGRESSION)'}`)
  if (mediaThrew instanceof ExportMediaError) {
    console.log(`  error type                : ExportMediaError`)
    console.log(`  failing objects named     : ${mediaThrew.failures.length}`)
    for (const f of mediaThrew.failures) {
      console.log(`      ${f.bucket}/${f.storagePath}  recorded by ${f.table}  (${f.message})`)
    }
  } else if (mediaThrew) {
    console.log(`  error type                : ${(mediaThrew as Error).name} (expected ExportMediaError)`)
  }

  assert('an unreadable recorded file aborts the build', mediaThrew !== null)
  assert('no zip is produced when a recorded file cannot be read', mediaProduced === null)
  assert('the error is an ExportMediaError', mediaThrew instanceof ExportMediaError)
  assert(
    'the failing object, bucket, and source table are all named',
    mediaThrew instanceof ExportMediaError &&
      mediaThrew.failures.some(f => f.storagePath === firstPath && f.bucket === firstBucket && !!f.table),
  )
  assert(
    'the underlying Storage message is preserved',
    mediaThrew instanceof ExportMediaError && mediaThrew.failures.some(f => f.message === MISS),
  )
  assert(
    'a deliberate skip is NOT fatal (twilio pseudo-paths still produce a zip)',
    manifest.excluded.every(e => !e.reason.startsWith('The database records this file')),
  )

  // ── Gates 5 and 6 ─────────────────────────────────────────────────────────
  if (!DO_UPLOAD) {
    rule('GATES 5 and 6  SKIPPED (pass --upload to run the delivery leg)')
  } else {
    rule('GATES 5 and 6  UPLOAD, SIGN, EXPIRY MATCH, EMAIL')

    const exportId   = 'probe-' + new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const objectPath = exportObjectPath(ARCHIVE_ID, exportId)

    // Preflight the size ceiling. Supabase rejects an oversized object with a
    // bare "The object exceeded the maximum allowed size", which does not say
    // whether the cap is the bucket's or the project global. A bucket with
    // file_size_limit = null inherits the global, which was 50 MB on this
    // project until 20260803_storage_size_limits.sql.
    const { data: bucketList } = await sb.storage.listBuckets()
    const bucketRow = (bucketList ?? []).find((b: { name: string }) => b.name === EXPORT_BUCKET) as
      { file_size_limit: number | null } | undefined
    const effectiveLimit = bucketRow?.file_size_limit ?? null

    console.log(`  ${EXPORT_BUCKET} file_size_limit: ${effectiveLimit === null ? 'null (inherits the project global)' : `${effectiveLimit} bytes (${mb(effectiveLimit)} MB)`}`)

    // null is a fail, not an unknown. 20260803_storage_size_limits.sql sets an
    // explicit limit on this bucket precisely so that null means "the migration
    // has not been applied", and the inherited global was measured at 50 MB.
    const preflightMsg =
      effectiveLimit === null
        ? `bucket carries no explicit limit, so it inherits the project global (measured at 50.00 MB on August 3, 2026)`
        : zip.length > effectiveLimit
          ? `bucket cap is ${mb(effectiveLimit)} MB`
          : null

    if (preflightMsg) {
      console.error(
        `\n  PREFLIGHT FAIL. This zip is ${mb(zip.length)} MB and the ${preflightMsg}.\n` +
        `  Apply supabase/migrations/20260803_storage_size_limits.sql, INCLUDING the\n` +
        `  dashboard step that raises the global limit, then re-run.\n` +
        `  Nothing was uploaded.`,
      )
      failures += 1
      return finish()
    }

    console.log(`  uploading ${mb(zip.length)} MB to ${EXPORT_BUCKET}/${objectPath} ...`)
    const tUp = Date.now()
    const { error: upErr } = await sb.storage.from(EXPORT_BUCKET).upload(objectPath, zip, {
      contentType: 'application/zip', upsert: true,
    })
    if (upErr) { console.error(`  UPLOAD FAILED: ${upErr.message}`); failures += 1; return finish() }
    console.log(`  uploaded in ${((Date.now() - tUp) / 1000).toFixed(1)} s`)

    const { data: listed } = await sb.storage.from(EXPORT_BUCKET).list(ARCHIVE_ID, { limit: 100 })
    const obj = (listed ?? []).find((o: { name: string }) => o.name === `${exportId}.zip`) as
      { name: string; created_at?: string; metadata?: { size?: number } } | undefined

    const createdAt = new Date(obj?.created_at ?? Date.now())
    const objectExpiry = expiresAt(createdAt)

    const { data: signed, error: signErr } = await sb.storage
      .from(EXPORT_BUCKET)
      .createSignedUrl(objectPath, RETENTION_SECONDS, { download: `basalith-archive-${exportId}` })
    if (signErr || !signed?.signedUrl) { console.error(`  SIGN FAILED: ${signErr?.message}`); failures += 1; return finish() }

    const urlExpiry = signedUrlExpiry(signed.signedUrl)

    console.log(`\n  object path         : ${objectPath}`)
    console.log(`  object size in bucket: ${obj?.metadata?.size} bytes (${mb(obj?.metadata?.size ?? 0)} MB)`)
    console.log(`  object created_at    : ${createdAt.toISOString()}`)
    console.log(`  retention            : ${RETENTION_SECONDS} s (${RETENTION_SECONDS / 86400} days)`)
    console.log(`  object reapable at   : ${objectExpiry.toISOString()}`)
    console.log(`  signed URL exp claim : ${urlExpiry?.toISOString()}`)
    console.log(`  delta                : ${urlExpiry ? Math.abs(urlExpiry.getTime() - objectExpiry.getTime()) / 1000 : 'n/a'} s`)

    assert('uploaded size matches the built zip', obj?.metadata?.size === zip.length, `bucket=${obj?.metadata?.size} built=${zip.length}`)
    assert('signed URL carries an exp claim', urlExpiry !== null)
    assert(
      'object reap time and signed URL expiry are the same second',
      !!urlExpiry && Math.abs(urlExpiry.getTime() - objectExpiry.getTime()) < 1000,
    )

    const expiryDate = formatExpiry(objectExpiry)
    const html = buildExportReadyEmail({
      firstName:   built.archive.ownerName?.split(' ')[0] ?? 'there',
      archiveName: built.archive.name,
      downloadUrl: signed.signedUrl,
      expiryDate,
      fileCount:   manifest.totals.mediaFiles,
      recordCount: manifest.totals.tableRows,
      sizeMb:      mb(zip.length),
    })

    const outDir = path.resolve(process.cwd(), '.probe-out')
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'export-email.html'), html)

    console.log(`\n  --- EMAIL ---`)
    console.log(`  to      : ${built.archive.ownerEmail}`)
    console.log(`  subject : ${buildExportReadySubject(built.archive.name)}`)
    console.log(`  absolute expiry rendered in body: "${expiryDate}"`)
    console.log(`  body text (tags stripped):\n`)
    console.log(
      html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ')
        .split('\n').map(l => l.trim()).filter(Boolean).map(l => '    ' + l).join('\n'),
    )
    console.log(`\n  full HTML written to .probe-out/export-email.html`)

    assert('email body states an absolute date, not a duration', html.includes(expiryDate))
    assert('email does not say "expires in"', !/expires in/i.test(html))
    // Whitespace-tolerant: the template wraps this sentence across a line break.
    assert('email offers another export at any time', /request\s+another\s+export\s+at\s+any\s+time/i.test(html))
    assert('email contains no em dash', !html.includes('—'))

    if (DO_SEND) {
      const { resend } = await import('../lib/resend')
      const sent = await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz',
        to:      built.archive.ownerEmail!,
        subject: buildExportReadySubject(built.archive.name),
        html,
      })
      console.log(`\n  SENT. resend id: ${JSON.stringify((sent as { data?: { id?: string } })?.data?.id ?? sent)}`)
    } else {
      console.log(`\n  not sent (pass --send to deliver)`)
    }
  }

  finish()
}

function finish() {
  rule(failures === 0 ? `ALL GATES PASS` : `${failures} ASSERTION(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
