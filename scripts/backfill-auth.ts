/**
 * Phase 3 of the Supabase Auth migration: one-time backfill that creates and
 * links Supabase Auth users for existing archive owners, Legacy Guides
 * (archivists), and successors.
 *
 * This script is NOT imported by app code and does not run automatically.
 * It is meant to be run by hand, once, from the command line.
 *
 * Dry run (default, writes nothing):
 *   npx tsx scripts/backfill-auth.ts
 *
 * Commit (creates or reuses auth users, sets app_metadata.role, and writes
 * linkage columns):
 *   npx tsx scripts/backfill-auth.ts --commit
 *
 * Required env vars (read from .env.local if present):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY
const COMMIT        = process.argv.includes('--commit')

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('\nERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  console.error('Set them in .env.local or in your shell environment.\n')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type PrimaryRole = 'owner' | 'guide' | 'successor'

interface Identity {
  email:        string
  archiveIds:   string[]               // archives.id where owner_email = email
  archivistIds: string[]               // archivists.id where email = email
  successors:   { id: string; archiveId: string }[]
}

// ─────────────────────────────────────────────────────────────────────────
// Step 1 — verify schema prerequisites
// ─────────────────────────────────────────────────────────────────────────

interface CheckResult {
  label: string
  ok:    boolean
  error?: string
}

async function checkColumnExists(table: string, column: string): Promise<CheckResult> {
  const { error } = await supabaseAdmin.from(table).select(column).limit(0)
  if (error && error.code === '42703') {
    return { label: `column "${table}.${column}" exists`, ok: false, error: error.message }
  }
  if (error) {
    return { label: `column "${table}.${column}" exists`, ok: false, error: error.message }
  }
  return { label: `column "${table}.${column}" exists`, ok: true }
}

async function verifyPrerequisites(): Promise<void> {
  console.log('── Verifying schema prerequisites ──────────────────────────────\n')

  const checks: CheckResult[] = []

  checks.push(await checkColumnExists('archives',    'owner_user_id'))
  checks.push(await checkColumnExists('archivists',  'auth_user_id'))
  checks.push(await checkColumnExists('successors',  'auth_user_id'))
  checks.push(await checkColumnExists('archives',    'owner_email'))
  checks.push(await checkColumnExists('archivists',  'email'))
  checks.push(await checkColumnExists('successors',  'email'))

  let allOk = true
  for (const c of checks) {
    console.log(`  [${c.ok ? 'OK' : 'MISSING'}] ${c.label}`)
    if (!c.ok) {
      allOk = false
      if (c.error) console.log(`           ${c.error}`)
    }
  }
  console.log('')

  if (!allOk) {
    console.error('ERROR: one or more prerequisites are missing. Apply the Phase 2 SQL')
    console.error('(archives.owner_user_id; archivists.auth_user_id;')
    console.error('successors.auth_user_id) before running this script.\n')
    process.exit(1)
  }

  console.log('All prerequisites present.\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Step 2 — build the plan
// ─────────────────────────────────────────────────────────────────────────

async function fetchAllRows<T>(
  table: string,
  columns: string,
): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const rows: T[] = []

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1)

    if (error) {
      console.error(`ERROR fetching from ${table}: ${error.message}`)
      process.exit(1)
    }
    if (!data || data.length === 0) break

    rows.push(...(data as unknown as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function buildPlan(): Promise<Map<string, Identity>> {
  const archives = await fetchAllRows<{ id: string; owner_email: string | null }>(
    'archives', 'id, owner_email',
  )
  const archivists = await fetchAllRows<{ id: string; email: string | null }>(
    'archivists', 'id, email',
  )
  const successors = await fetchAllRows<{ id: string; email: string | null; archive_id: string }>(
    'successors', 'id, email, archive_id',
  )

  const byEmail = new Map<string, Identity>()

  function getIdentity(emailRaw: string | null): Identity | null {
    if (!emailRaw || !emailRaw.trim()) return null
    const email = emailRaw.trim().toLowerCase()
    let identity = byEmail.get(email)
    if (!identity) {
      identity = { email, archiveIds: [], archivistIds: [], successors: [] }
      byEmail.set(email, identity)
    }
    return identity
  }

  for (const a of archives) {
    const identity = getIdentity(a.owner_email)
    if (identity) identity.archiveIds.push(a.id)
  }
  for (const a of archivists) {
    const identity = getIdentity(a.email)
    if (identity) identity.archivistIds.push(a.id)
  }
  for (const s of successors) {
    const identity = getIdentity(s.email)
    if (identity) identity.successors.push({ id: s.id, archiveId: s.archive_id })
  }

  return byEmail
}

function primaryRole(identity: Identity): PrimaryRole {
  if (identity.archiveIds.length    > 0) return 'owner'
  if (identity.archivistIds.length  > 0) return 'guide'
  return 'successor'
}

function describeLinkages(identity: Identity): string[] {
  const lines: string[] = []
  for (const archiveId of identity.archiveIds) {
    lines.push(`archives.owner_user_id = <user> where id = ${archiveId}`)
  }
  for (const archivistId of identity.archivistIds) {
    lines.push(`archivists.auth_user_id = <user> where id = ${archivistId}`)
  }
  for (const s of identity.successors) {
    lines.push(`successors.auth_user_id = <user> where id = ${s.id} (archive ${s.archiveId})`)
  }
  return lines
}

// ─────────────────────────────────────────────────────────────────────────
// Auth user lookup / creation
// ─────────────────────────────────────────────────────────────────────────

async function listAllAuthUsersByEmail(): Promise<Map<string, { id: string; appMetadata: Record<string, unknown> }>> {
  const byEmail = new Map<string, { id: string; appMetadata: Record<string, unknown> }>()
  const perPage = 1000
  let page = 1

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error(`ERROR listing auth users: ${error.message}`)
      process.exit(1)
    }
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email.toLowerCase(), { id: u.id, appMetadata: u.app_metadata ?? {} })
    }
    if (data.users.length < perPage) break
    page += 1
  }

  return byEmail
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  await verifyPrerequisites()

  const plan = await buildPlan()
  const existingUsers = await listAllAuthUsersByEmail()

  const multiIdentityEmails: string[] = []
  let createCount = 0
  let reuseCount  = 0
  let roleUpdateCount = 0

  let archiveLinkages   = 0
  let archivistLinkages = 0
  let successorLinkages = 0

  console.log(`── ${COMMIT ? 'COMMIT' : 'DRY RUN'} ──────────────────────────────────────────────\n`)
  console.log(`Found ${plan.size} distinct email${plan.size === 1 ? '' : 's'} across archives, archivists, and successors.\n`)

  for (const [email, identity] of [...plan.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const role = primaryRole(identity)
    const identityCount = (identity.archiveIds.length > 0 ? 1 : 0)
                         + (identity.archivistIds.length > 0 ? 1 : 0)
                         + (identity.successors.length > 0 ? 1 : 0)
    if (identityCount > 1) multiIdentityEmails.push(email)

    const existing = existingUsers.get(email)
    const linkages = describeLinkages(identity)

    if (!COMMIT) {
      if (existing) {
        console.log(`${email}`)
        console.log(`  action: reuse existing auth user (${existing.id})`)
        reuseCount += 1
      } else {
        console.log(`${email}`)
        console.log(`  action: create new auth user`)
        createCount += 1
      }
      console.log(`  primary role: ${role}`)
      for (const line of linkages) console.log(`  linkage: ${line}`)
      console.log('')
      continue
    }

    // ── COMMIT ──────────────────────────────────────────────────────────
    let userId: string

    if (existing) {
      userId = existing.id
      reuseCount += 1

      const currentRole = (existing.appMetadata as { role?: string }).role
      if (currentRole !== role) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: { ...existing.appMetadata, role },
        })
        if (error) {
          console.error(`ERROR updating app_metadata.role for ${email}: ${error.message}`)
          process.exit(1)
        }
        roleUpdateCount += 1
        console.log(`${email}: reused existing user ${userId}, updated role ${currentRole ?? '(none)'} -> ${role}`)
      } else {
        console.log(`${email}: reused existing user ${userId}, role already ${role}`)
      }
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        app_metadata: { role },
      })
      if (error || !data.user) {
        console.error(`ERROR creating auth user for ${email}: ${error?.message}`)
        process.exit(1)
      }
      userId = data.user.id
      createCount += 1
      console.log(`${email}: created new user ${userId}, role ${role}`)
    }

    // ── linkages ────────────────────────────────────────────────────────
    for (const archiveId of identity.archiveIds) {
      const { error } = await supabaseAdmin
        .from('archives')
        .update({ owner_user_id: userId })
        .eq('id', archiveId)
      if (error) {
        console.error(`ERROR linking archives.owner_user_id for ${email} (archive ${archiveId}): ${error.message}`)
        process.exit(1)
      }
      archiveLinkages += 1
    }

    for (const archivistId of identity.archivistIds) {
      const { error } = await supabaseAdmin
        .from('archivists')
        .update({ auth_user_id: userId })
        .eq('id', archivistId)
      if (error) {
        console.error(`ERROR linking archivists.auth_user_id for ${email} (archivist ${archivistId}): ${error.message}`)
        process.exit(1)
      }
      archivistLinkages += 1
    }

    for (const s of identity.successors) {
      const { error } = await supabaseAdmin
        .from('successors')
        .update({ auth_user_id: userId })
        .eq('id', s.id)
      if (error) {
        console.error(`ERROR linking successors.auth_user_id for ${email} (successor ${s.id}): ${error.message}`)
        process.exit(1)
      }
      successorLinkages += 1
    }
  }

  console.log('\n── Summary ──────────────────────────────────────────────────────\n')
  console.log(`Mode:                    ${COMMIT ? 'commit (wrote changes)' : 'dry run (wrote nothing)'}`)
  console.log(`Distinct emails:         ${plan.size}`)
  console.log(`Auth users created:      ${createCount}`)
  console.log(`Auth users reused:       ${reuseCount}`)
  if (COMMIT) console.log(`Roles updated on reuse:  ${roleUpdateCount}`)
  console.log(`Archive linkages:        ${COMMIT ? archiveLinkages : plan.size && [...plan.values()].reduce((n, i) => n + i.archiveIds.length, 0)}`)
  console.log(`Archivist linkages:      ${COMMIT ? archivistLinkages : [...plan.values()].reduce((n, i) => n + i.archivistIds.length, 0)}`)
  console.log(`Successor linkages:      ${COMMIT ? successorLinkages : [...plan.values()].reduce((n, i) => n + i.successors.length, 0)}`)
  console.log('')

  if (multiIdentityEmails.length > 0) {
    console.log(`Emails mapping to more than one identity type (${multiIdentityEmails.length}):`)
    for (const email of multiIdentityEmails) {
      const identity = plan.get(email)!
      const types: string[] = []
      if (identity.archiveIds.length   > 0) types.push(`owner x${identity.archiveIds.length}`)
      if (identity.archivistIds.length > 0) types.push(`guide x${identity.archivistIds.length}`)
      if (identity.successors.length   > 0) types.push(`successor x${identity.successors.length}`)
      console.log(`  ${email}: ${types.join(', ')} (primary role: ${primaryRole(identity)})`)
    }
  } else {
    console.log('No emails mapped to more than one identity type.')
  }
  console.log('')

  if (!COMMIT) {
    console.log('This was a dry run. No auth users or linkage columns were written.')
    console.log('Re-run with --commit to apply.\n')
  }
}

main().catch(err => {
  console.error('Backfill error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
