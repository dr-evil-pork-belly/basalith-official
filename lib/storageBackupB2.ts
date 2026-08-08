/**
 * Backblaze B2, through its S3 compatible endpoint.
 *
 * Server only. Imported by lib/inngest/storageBackupFunctions.ts and by nothing
 * that reaches a client bundle.
 *
 * THE KEY THIS USES CANNOT DELETE. It is scoped to listBuckets, listFiles,
 * readFiles, writeFiles, explicitly without deleteFiles, so that a bug in the
 * sync cannot destroy the copy of last resort. There is deliberately no delete
 * function in this file. Deletion at the end of a dissolution is performed by a
 * separate key, by hand, and is documented in docs/DISSOLUTION_RUNBOOK.md
 * sections 4.5 and 5. Do not add a delete helper here.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3'

/**
 * No credential means throw. Not skip, not no-op. A backup job that quietly
 * does nothing when a credential is missing is the silence failure with extra
 * steps. Skeleton section 7.
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `[storage-backup] ${name} is not set. Refusing to run: a backup that silently ` +
        `does nothing is worse than one that fails loudly.`,
    )
  }
  return value
}

let cached: S3Client | null = null

export function b2Client(): S3Client {
  if (cached) return cached
  cached = new S3Client({
    endpoint: requireEnv('B2_ENDPOINT'),
    region: requireEnv('B2_REGION'),
    credentials: {
      accessKeyId: requireEnv('B2_KEY_ID'),
      secretAccessKey: requireEnv('B2_APPLICATION_KEY'),
    },
    // B2's S3 layer wants path style addressing.
    forcePathStyle: true,
  })
  return cached
}

export function b2Bucket(): string {
  return requireEnv('B2_BUCKET')
}

/** True when every B2 variable is present. Used only to fail fast with a clear message. */
export function b2Configured(): boolean {
  return Boolean(
    process.env.B2_ENDPOINT &&
      process.env.B2_REGION &&
      process.env.B2_KEY_ID &&
      process.env.B2_APPLICATION_KEY &&
      process.env.B2_BUCKET,
  )
}

export interface PutResult {
  /** B2's version id for this write. Stored as storage_backup_objects.b2_file_id. */
  fileId: string
  lockedUntil: string
}

/**
 * Writes one object version with an explicit COMPLIANCE retention.
 *
 * Two layers on purpose. The bucket carries a 90 day COMPLIANCE default, and
 * every PUT also sends the mode and retain-until headers. A bug that drops the
 * header still gets the bucket default, and a bucket misconfiguration is still
 * caught by the explicit header. Skeleton section 8.
 */
export async function putLocked(params: {
  key: string
  body: Uint8Array
  sha256: string
  contentType?: string
  retainUntil: Date
}): Promise<PutResult> {
  const input: PutObjectCommandInput = {
    Bucket: b2Bucket(),
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType ?? 'application/octet-stream',
    ObjectLockMode: 'COMPLIANCE',
    ObjectLockRetainUntilDate: params.retainUntil,
    // Our own hash, carried alongside the object so a restore from B2 alone can
    // check integrity without the Postgres manifest.
    Metadata: { sha256: params.sha256 },
  }

  const res = await b2Client().send(new PutObjectCommand(input))

  if (!res.VersionId) {
    // Without a version id there is no way to target this exact version for
    // deletion at the end of a dissolution, which makes the object undeletable
    // in practice. Refuse to record it as copied.
    throw new Error(
      `[storage-backup] PUT ${params.key} returned no VersionId. The bucket is probably not ` +
        `versioned. Object Lock requires versioning, so this needs fixing before any sync runs.`,
    )
  }

  return { fileId: res.VersionId, lockedUntil: params.retainUntil.toISOString() }
}

/** Reads one object back, for the weekly re-hash and the restore drill. */
export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const res = await b2Client().send(
    new GetObjectCommand({ Bucket: b2Bucket(), Key: key }),
  )
  if (!res.Body) throw new Error(`[storage-backup] GET ${key} returned no body`)
  return await res.Body.transformToByteArray()
}

export interface DestObject {
  key: string
  size: number
}

/**
 * Lists the current version of every key. Paginated, because B2 caps a page at
 * 1000 and the property will pass that.
 *
 * This lists current versions only, which is what the structural diff compares.
 * A dissolution needs every version, not the current one, and that is done by
 * hand with list-object-versions per the runbook.
 */
export async function listAll(prefix?: string): Promise<DestObject[]> {
  const out: DestObject[] = []
  let token: string | undefined

  do {
    const res = await b2Client().send(
      new ListObjectsV2Command({
        Bucket: b2Bucket(),
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    )
    for (const o of res.Contents ?? []) {
      if (o.Key) out.push({ key: o.Key, size: o.Size ?? 0 })
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)

  return out
}
