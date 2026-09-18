/**
 * Trial expiry probe. Runs the SAME per-archive sequence the Inngest
 * function trialExpire runs (lib/trialExpiryRunner.ts) against one expired
 * trial, printing the counts before and after. Slice B's production gate,
 * docs/TRIAL_SLICE_B_2026-09-17.md.
 *
 *   npx tsx scripts/trial-expiry-probe.ts <archive-id> --dry-run   before counts and the
 *                                                               canDeleteAuthUser decision;
 *                                                               writes nothing
 *   npx tsx scripts/trial-expiry-probe.ts <archive-id>             deletes, then after counts
 *
 * Refuses unless the row is status = 'trial' with trial_expires_at in the past
 * and scheduled_deletion_at null, which is the exact select the cron makes.
 * Set trial_expires_at back by hand in the SQL editor to rehearse on a
 * throwaway trial. Never point this at a family archive; it will refuse, and
 * the refusal is the point.
 *
 * Same shape as scripts/gap-log-probe.ts: env from .env.local, the service
 * role client, pasted output as the gate.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { PURGE_BUCKETS, walkPrefix } from '../lib/storagePurge'
import { canDeleteAuthUser, selectTrialsToExpire, type DeleteStep, type TrialRow } from '../lib/trialExpiry'
import { runTrialExpiryForArchive } from '../lib/trialExpiryRunner'
import { notifyInternal } from '../lib/internalNotify'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const archiveId = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

if (!archiveId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(archiveId)) {
  console.error('usage: npx tsx scripts/trial-expiry-probe.ts <archive-uuid> [--dry-run]')
  process.exit(1)
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function count(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await db.from(table).select('id', { count: 'exact', head: true }).eq(column, value)
  if (error) throw new Error(`count ${table}.${column}: ${error.message}`)
  return count ?? 0
}

async function authUserPresent(uid: string | null): Promise<boolean> {
  if (!uid) return false
  const { data, error } = await db.auth.admin.getUserById(uid)
  if (error && /not found/i.test(error.message)) return false
  if (error) throw new Error(`getUserById: ${error.message}`)
  return !!data?.user
}

type Snapshot = {
  archives: number
  owner_deposits: number
  incident_sessions: number
  training_pairs: number
  email_replies: number
  archive_applications: number
  profiles: number
  auth_user: boolean
  storage: Record<string, number>
  storage_backup_objects: number
}

async function snapshot(uid: string | null, email: string | null): Promise<Snapshot> {
  const storage: Record<string, number> = {}
  for (const bucket of PURGE_BUCKETS) {
    const paths: string[] = []
    await walkPrefix(db.storage, bucket, archiveId, paths)
    storage[bucket] = paths.length
  }
  return {
    archives:               await count('archives', 'id', archiveId),
    owner_deposits:         await count('owner_deposits', 'archive_id', archiveId),
    incident_sessions:      await count('incident_sessions', 'archive_id', archiveId),
    training_pairs:         await count('training_pairs', 'archive_id', archiveId),
    email_replies:          await count('email_replies', 'archive_id', archiveId),
    archive_applications:   email
      ? ((await db.from('archive_applications').select('id', { count: 'exact', head: true }).eq('email', email).eq('status', 'trial')).count ?? 0)
      : 0,
    profiles:               uid ? await count('profiles', 'id', uid) : 0,
    auth_user:              await authUserPresent(uid),
    storage,
    storage_backup_objects: await count('storage_backup_objects', 'archive_id', archiveId),
  }
}

function print(label: string, s: Snapshot) {
  console.log(`\n=== ${label} ===`)
  for (const [k, v] of Object.entries(s)) {
    if (k === 'storage') for (const [b, n] of Object.entries(v as Record<string, number>)) console.log(`  storage ${b.padEnd(18)} ${n}`)
    else console.log(`  ${k.padEnd(24)} ${v}`)
  }
}

async function main() {
  const { data: row, error } = await db
    .from('archives')
    .select('id, name, owner_email, owner_name, owner_user_id, status, trial_expires_at, scheduled_deletion_at, termination_requested_at')
    .eq('id', archiveId)
    .maybeSingle()
  if (error) throw new Error(`archive read: ${error.message}`)
  if (!row) throw new Error(`no archives row for ${archiveId}. Refusing.`)

  console.log(`archive:               ${row.name} (${archiveId})`)
  console.log(`status:                ${row.status}`)
  console.log(`trial_expires_at:      ${row.trial_expires_at}`)
  console.log(`scheduled_deletion_at: ${row.scheduled_deletion_at}`)
  console.log(`owner_user_id:         ${row.owner_user_id}`)

  // The same predicate the cron applies.
  const selected = selectTrialsToExpire([{ ...row, trial_warned_at: null } as TrialRow], new Date())
  if (selected.length === 0) {
    throw new Error(
      `${archiveId} is not an expired trial (status must be 'trial', trial_expires_at in the past, ` +
        `scheduled_deletion_at null). Refusing.`,
    )
  }

  const uid = (row.owner_user_id as string | null) ?? null
  const email = (row.owner_email as string | null) ?? null

  const before = await snapshot(uid, email)
  print('BEFORE', before)

  // The decision maybe_delete_user would make. ownedArchives counts other
  // archives only, so the row being deleted is subtracted here.
  const counts = {
    ownedArchives:   uid ? (await count('archives', 'owner_user_id', uid)) - 1 : 0,
    contributorRows: email ? await count('contributors', 'email', email) : 0,
    successorRows:   uid ? await count('successors', 'auth_user_id', uid) : 0,
    archivistRows:   uid ? await count('archivists', 'auth_user_id', uid) : 0,
  }
  console.log(`\ncanDeleteAuthUser ${JSON.stringify(counts)} -> ${uid ? canDeleteAuthUser(counts) : 'false (no owner_user_id)'}`)

  if (dryRun) {
    console.log('\nDry run. Nothing written. Re-run without --dry-run to delete.')
    return
  }

  console.log('\n=== RUN ===')
  const outcome = await runTrialExpiryForArchive(archiveId, {
    supabaseAdmin: db,
    notify: notifyInternal,
    runStep: async <T,>(name: DeleteStep, fn: () => Promise<T>) => {
      console.log(`  step ${name}`)
      return fn()
    },
    log: (line) => console.log(`    ${line}`),
  })
  console.log(`\noutcome: ${JSON.stringify(outcome, null, 2)}`)

  const after = await snapshot(uid, email)
  print('AFTER', after)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
