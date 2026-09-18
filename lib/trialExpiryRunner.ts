/**
 * The per-archive trial delete. One body, two callers: the Inngest function
 * trialExpire (lib/inngest/trialFunctions.ts) wraps each step in step.run so
 * a retry re-runs only what did not complete, and the probe script
 * (scripts/trial-expiry-probe.ts) runs the steps directly. DELETE_ORDER in
 * lib/trialExpiry.ts is the sequence; every step is written so a second
 * execution is a no-op.
 *
 * The live cascade map (docs/SELF_SERVE_BUILD_B_2026-09-17.md): 50 of the
 * 51 tables carrying archive_id cascade from archives; email_replies has a
 * no-action FK and goes first; archive_applications has no FK and is keyed
 * by email; storage_backup_objects has no FK by design and is asserted
 * empty, never deleted; profiles and auth.users are outside the cascade and
 * go last, conditionally.
 *
 * Nothing here is reachable from a request. No after() applies.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { canDeleteAuthUser, emailDomain, type DeleteStep } from './trialExpiry'
import { purgeArchiveStorage, type PurgeResult } from './storagePurge'

export interface RunnerDeps {
  supabaseAdmin: Pick<SupabaseClient, 'from' | 'storage' | 'auth'>
  /** Internal notice. lib/internalNotify.ts in production; a recorder in tests. */
  notify: (input: { subject: string; text: string }) => Promise<void>
  /** Inngest: (name, fn) => step.run(`${name}:${archiveId}`, fn). Script: (name, fn) => fn(). */
  runStep: <T>(name: DeleteStep, fn: () => Promise<T>) => Promise<T>
  log?: (line: string) => void
  now?: () => Date
}

export interface ExpiryOutcome {
  archiveId: string
  /** Set when assert_no_b2 stopped the delete. Nothing after it ran. */
  stoppedAt: 'assert_no_b2' | null
  b2Objects: number
  storage: { bucket: string; found: number; deleted: number }[]
  storageTotal: number
  /** Owner deposits at the moment of deletion. */
  depositsAtDeletion: number
  /** Rows left in three cascaded tables after the delete. All zero on success. */
  after: { owner_deposits: number; incident_sessions: number; training_pairs: number }
  emailDomain: string
  userDeleted: boolean
  userKeptReason: string | null
}

type OwnerRead = { ownerUserId: string | null; ownerEmail: string | null; name: string | null; deposits: number; alreadyGone: boolean }

async function count(db: Pick<SupabaseClient, 'from'>, table: string, column: string, value: string): Promise<number> {
  const { count, error } = await db.from(table).select('id', { count: 'exact', head: true }).eq(column, value)
  if (error) throw new Error(`count ${table}.${column}: ${error.message}`)
  return count ?? 0
}

export async function runTrialExpiryForArchive(archiveId: string, deps: RunnerDeps): Promise<ExpiryOutcome> {
  const { supabaseAdmin: db, notify, runStep } = deps
  const log = deps.log ?? ((line: string) => console.log(line))
  const now = deps.now ?? (() => new Date())

  // 1. mark_terminated. Re-checks the selection on the row itself so a stale
  //    or hand-typed id can never delete a converted or owner-terminated
  //    archive: this is the same predicate selectTrialsToExpire applied.
  await runStep('mark_terminated', async () => {
    const { data: row, error } = await db
      .from('archives')
      .select('id, status, trial_expires_at, scheduled_deletion_at, termination_requested_at')
      .eq('id', archiveId)
      .maybeSingle()
    if (error) throw new Error(`mark_terminated read: ${error.message}`)
    if (!row) return { alreadyGone: true }
    if (row.status !== 'trial') throw new Error(`${archiveId} has status ${row.status}, not trial. Refusing.`)
    if (row.scheduled_deletion_at) throw new Error(`${archiveId} has scheduled_deletion_at set (owner-terminated path). Refusing.`)
    if (!row.trial_expires_at || new Date(row.trial_expires_at).getTime() >= now().getTime()) {
      throw new Error(`${archiveId} has not expired (trial_expires_at ${row.trial_expires_at}). Refusing.`)
    }
    if (!row.termination_requested_at) {
      const { error: upErr } = await db
        .from('archives')
        .update({ termination_requested_at: now().toISOString() })
        .eq('id', archiveId)
        .is('termination_requested_at', null)
      if (upErr) throw new Error(`mark_terminated update: ${upErr.message}`)
    }
    return { alreadyGone: false }
  })

  // 2. purge_storage. The lib refuses unless termination_requested_at is set,
  //    which step 1 guaranteed. A second run finds nothing and deletes nothing.
  const storage = await runStep('purge_storage', async () => {
    const { data: row } = await db.from('archives').select('id').eq('id', archiveId).maybeSingle()
    if (!row) return { buckets: [] as PurgeResult['buckets'], total: 0 }
    const r = await purgeArchiveStorage(archiveId, { supabaseAdmin: db, log })
    return { buckets: r.buckets.map(b => ({ bucket: b.bucket, found: b.found, deleted: b.deleted })), total: r.total }
  })

  // 3. assert_no_b2. The slice A exclusion promised no trial object ever
  //    entered B2. A non-zero count here is a bug to read, not a row to
  //    delete around: stop this archive, tell the founder, move on.
  const b2Objects = await runStep('assert_no_b2', async () => {
    const n = await count(db, 'storage_backup_objects', 'archive_id', archiveId)
    if (n > 0) {
      await notify({
        subject: `Trial has B2 objects, not deleted: ${archiveId}`,
        text: [
          `Archive: ${archiveId}`,
          `storage_backup_objects rows: ${n}`,
          '',
          'The trial exclusion in the backup sync (lib/storageBackup.ts excludedArchiveIds) should have kept',
          'this archive out of B2. The expiry job stopped before deleting any rows. Read the manifest rows',
          'and the sync runs for the dates involved before doing anything else. The Supabase Storage',
          'objects under the prefix were purged in the step before this one.',
        ].join('\n'),
      })
    }
    return n
  })

  const empty: ExpiryOutcome = {
    archiveId,
    stoppedAt: null,
    b2Objects,
    storage: storage.buckets,
    storageTotal: storage.total,
    depositsAtDeletion: 0,
    after: { owner_deposits: 0, incident_sessions: 0, training_pairs: 0 },
    emailDomain: '(unknown)',
    userDeleted: false,
    userKeptReason: null,
  }
  if (b2Objects > 0) {
    log(`[trial-expiry] ${archiveId}: ${b2Objects} storage_backup_objects rows. Stopped at assert_no_b2.`)
    return { ...empty, stoppedAt: 'assert_no_b2' }
  }

  // 4. delete_email_replies. The one no-action FK onto archives.
  await runStep('delete_email_replies', async () => {
    const { error } = await db.from('email_replies').delete().eq('archive_id', archiveId)
    if (error) throw new Error(`delete_email_replies: ${error.message}`)
    return true
  })

  // 5. delete_application. Keyed by the owner's email and status trial; no
  //    FK, so the cascade never reaches it. Read the email from the row while
  //    the row still exists.
  await runStep('delete_application', async () => {
    const { data: row } = await db.from('archives').select('owner_email').eq('id', archiveId).maybeSingle()
    const email = (row?.owner_email as string | null) ?? null
    if (!email) return { deleted: 0, reason: 'archive row gone or no email' }
    const { data, error } = await db
      .from('archive_applications')
      .delete()
      .eq('email', email)
      .eq('status', 'trial')
      .select('id')
    if (error) throw new Error(`delete_application: ${error.message}`)
    return { deleted: data?.length ?? 0 }
  })

  // 6. delete_archive. Read what is needed after the row is gone, then one
  //    delete; the cascade takes the rest. Confirm three cascaded tables are
  //    empty and log the counts.
  const owner = await runStep('delete_archive', async () => {
    const { data: row, error } = await db
      .from('archives')
      .select('owner_user_id, owner_email, name')
      .eq('id', archiveId)
      .maybeSingle()
    if (error) throw new Error(`delete_archive read: ${error.message}`)
    if (!row) {
      return { ownerUserId: null, ownerEmail: null, name: null, deposits: 0, alreadyGone: true, after: { owner_deposits: 0, incident_sessions: 0, training_pairs: 0 } }
    }
    const { count: deposits } = await db
      .from('owner_deposits')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .is('contributor_id', null)

    const { error: delErr } = await db.from('archives').delete().eq('id', archiveId)
    if (delErr) throw new Error(`delete_archive: ${delErr.message}`)

    const after = {
      owner_deposits:    await count(db, 'owner_deposits', 'archive_id', archiveId),
      incident_sessions: await count(db, 'incident_sessions', 'archive_id', archiveId),
      training_pairs:    await count(db, 'training_pairs', 'archive_id', archiveId),
    }
    log(`[trial-expiry] ${archiveId}: after delete, owner_deposits=${after.owner_deposits} incident_sessions=${after.incident_sessions} training_pairs=${after.training_pairs}`)
    if (after.owner_deposits || after.incident_sessions || after.training_pairs) {
      throw new Error(`delete_archive: rows survived the cascade for ${archiveId}: ${JSON.stringify(after)}`)
    }
    const read: OwnerRead & { after: typeof after } = {
      ownerUserId: (row.owner_user_id as string | null) ?? null,
      ownerEmail:  (row.owner_email as string | null) ?? null,
      name:        (row.name as string | null) ?? null,
      deposits:    deposits ?? 0,
      alreadyGone: false,
      after,
    }
    return read
  })

  // 7. maybe_delete_user. Only if the user owns nothing else and holds no
  //    other role. Column names confirmed in live code: archives.owner_user_id,
  //    contributors.email, successors.auth_user_id, archivists.auth_user_id,
  //    profiles.id.
  const user = await runStep('maybe_delete_user', async () => {
    const uid = owner.ownerUserId
    const email = owner.ownerEmail
    if (!uid) return { deleted: false, reason: 'no owner_user_id on the archive row' }

    const counts = {
      ownedArchives:   await count(db, 'archives', 'owner_user_id', uid),
      contributorRows: email ? await count(db, 'contributors', 'email', email) : 0,
      successorRows:   await count(db, 'successors', 'auth_user_id', uid),
      archivistRows:   await count(db, 'archivists', 'auth_user_id', uid),
    }
    if (!canDeleteAuthUser(counts)) {
      const reason = `user kept: ${JSON.stringify(counts)}`
      log(`[trial-expiry] ${archiveId}: ${reason}`)
      return { deleted: false, reason }
    }

    const { error: profErr } = await db.from('profiles').delete().eq('id', uid)
    if (profErr) throw new Error(`delete profiles: ${profErr.message}`)

    const { error: userErr } = await db.auth.admin.deleteUser(uid)
    // A second execution finds the user already gone. That is the no-op.
    if (userErr && !/not found/i.test(userErr.message)) throw new Error(`deleteUser: ${userErr.message}`)
    return { deleted: true, reason: null }
  })

  const outcome: ExpiryOutcome = {
    ...empty,
    depositsAtDeletion: owner.deposits,
    after: owner.after,
    emailDomain: emailDomain(owner.ownerEmail),
    userDeleted: user.deleted,
    userKeptReason: user.reason,
  }

  // 8. notify. Domain only, never the address.
  await runStep('notify', async () => {
    await notify({
      subject: `Trial expired and deleted: ${owner.name ?? archiveId}`,
      text: [
        `Archive: ${archiveId}${owner.name ? ` (${owner.name})` : ''}`,
        `Owner email domain: ${outcome.emailDomain}`,
        `Deposits at deletion: ${outcome.depositsAtDeletion}`,
        `Auth user deleted: ${outcome.userDeleted ? 'yes' : `no (${outcome.userKeptReason})`}`,
        `Storage objects purged: ${outcome.storageTotal}` +
          (outcome.storage.length ? ` (${outcome.storage.filter(b => b.found).map(b => `${b.bucket} ${b.deleted}`).join(', ') || 'none'})` : ''),
        `B2 objects: ${outcome.b2Objects}`,
        `After the cascade: owner_deposits ${outcome.after.owner_deposits}, incident_sessions ${outcome.after.incident_sessions}, training_pairs ${outcome.after.training_pairs}`,
      ].join('\n'),
    })
    return true
  })

  return outcome
}
