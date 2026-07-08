/**
 * Admin Legacy Guide provisioning. God-authed, not public, not self-serve.
 *
 * One coherent, idempotent operation: create or reuse the Supabase Auth user,
 * upsert the archivists row by its unique email, wire archivists.auth_user_id,
 * then mint a magic link for handoff. It cannot leave a half-wired account: it
 * re-reads the row and asserts auth_user_id matches before returning success,
 * and it never deletes an auth user (which might belong to an owner). A partial
 * failure returns an error, and a re-run heals it. Mirrors the wiring pattern
 * in lib/billing/createArchive.ts.
 *
 * getOrCreateAuthUser will not overwrite an existing role, so provisioning an
 * email that already belongs to an owner or successor leaves that role intact.
 * When the effective role is not guide, the route wires the row (so the portal
 * resolves by archivistId) and returns a warning instead of flipping the role.
 *
 * Validation is manual typeof-checking, matching app/api/admin/checkout. zod is
 * not a dependency in this codebase despite the doc guidance.
 *
 * Two operator-only actions handle the legacy archivists rows that predate the
 * auth migration and still have a null auth_user_id. There is no blind sweep;
 * David decides per row:
 *   - list_unwired: report them, no writes
 *   - wire:         run the idempotent path against one existing row's email
 *   - retire:       soft-retire a row by status, never a hard delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { getGodModeAuth } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAuthUser } from '@/lib/auth/getOrCreateAuthUser'
import type { SessionRole } from '@/lib/auth/getSessionUser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ProvisionResult {
  archivistId: string
  authUserId:  string
  wired:       true
  role:        SessionRole
  reused:      boolean
  magicLink:   string | null
  warning?:    string
  handoff?:    string
}

// Create/reuse the auth user, upsert the archivists row by its unique email,
// wire auth_user_id, confirm the wiring, read the effective role, mint a link.
// requireExisting=true (the wire action) refuses to create a new row.
async function provisionGuide(
  opts: { email: string; name?: string; requireExisting?: boolean },
): Promise<ProvisionResult | { notFound: true; email: string }> {
  const email = opts.email.trim().toLowerCase()

  // 1. Auth user (create-or-reuse; does not overwrite an existing role).
  const authUserId = await getOrCreateAuthUser(email, 'guide')

  // 2. Upsert the archivists row BY the unique email.
  const { data: existing, error: findErr } = await supabaseAdmin
    .from('archivists')
    .select('id, name, email, status, auth_user_id')
    .eq('email', email)
    .maybeSingle()
  if (findErr) throw new Error(`Lookup failed: ${findErr.message}`)

  let rowId: string
  if (existing) {
    rowId = existing.id
  } else {
    if (opts.requireExisting) return { notFound: true, email }
    if (!opts.name) throw new Error('name is required to create a new Legacy Guide')
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('archivists')
      .insert({ name: opts.name, email, status: 'provisional' })
      .select('id')
      .single()
    if (insErr || !inserted) throw new Error(`Insert failed: ${insErr?.message ?? 'unknown'}`)
    rowId = inserted.id
  }

  // 3. Wire auth_user_id (writes the same value on a re-run, a no-op).
  const { error: wireErr } = await supabaseAdmin
    .from('archivists')
    .update({ auth_user_id: authUserId })
    .eq('id', rowId)
  if (wireErr) throw new Error(`Wire failed: ${wireErr.message}`)

  // Guard: re-read and assert the two match before calling it wired.
  const { data: verify, error: verErr } = await supabaseAdmin
    .from('archivists')
    .select('id, auth_user_id')
    .eq('id', rowId)
    .single()
  if (verErr || !verify) throw new Error(`Verify failed: ${verErr?.message ?? 'unknown'}`)
  if (verify.auth_user_id !== authUserId) {
    throw new Error('Post-write check failed: auth_user_id does not match the auth user')
  }

  // 4. Effective role (getOrCreateAuthUser leaves an existing role intact).
  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(authUserId)
  const role = (userRes?.user?.app_metadata?.role ?? null) as SessionRole

  let warning: string | undefined
  if (role && role !== 'guide') {
    warning =
      `This email's primary role is ${role}. The Legacy Guide portal resolves for it, ` +
      `but a magic-link sign in lands on the ${role} dashboard. ` +
      `For a clean Legacy Guide sign in, provision a separate email.`
  }

  // 5. Magic link for handoff (non-fatal: the Guide can request one at /archivist-login).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
  let magicLink: string | null = null
  try {
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type:    'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })
    if (linkErr) throw linkErr
    magicLink = linkData.properties?.action_link ?? null
  } catch (e) {
    console.error('[admin/guide] magic link generation failed:', e instanceof Error ? e.message : e)
  }

  const handoff = role === 'guide'
    ? 'Legacy Guide account is ready. Send this sign-in link to the Guide to open the Legacy Guide dashboard.'
    : undefined

  return { archivistId: rowId, authUserId, wired: true, role, reused: !!existing, magicLink, warning, handoff }
}

export async function POST(req: NextRequest) {
  if (!getGodModeAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: string; name?: string; email?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : 'provision'

  // ── list_unwired: report legacy null-auth rows, no writes ───────────────────
  if (action === 'list_unwired') {
    const { data, error } = await supabaseAdmin
      .from('archivists')
      .select('id, name, email, status, created_at')
      .is('auth_user_id', null)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ unwired: data ?? [], count: data?.length ?? 0 })
  }

  // ── retire: soft-retire one row by status, never a hard delete ──────────────
  if (action === 'retire') {
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'id is required to retire a Legacy Guide' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('archivists')
      .update({ status: 'retired' })
      .eq('id', body.id)
      .select('id, name, email, status')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'No Legacy Guide with that id' }, { status: 404 })
    return NextResponse.json({ retired: data })
  }

  // ── wire: run the idempotent path against an existing row's email ───────────
  if (action === 'wire') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required to wire a Legacy Guide' }, { status: 400 })
    }
    try {
      const result = await provisionGuide({ email, requireExisting: true })
      if ('notFound' in result) {
        return NextResponse.json({ error: `No Legacy Guide row exists for ${email}` }, { status: 404 })
      }
      return NextResponse.json(result)
    } catch (e) {
      console.error('[admin/guide] wire failed:', e instanceof Error ? e.message : e)
      return NextResponse.json({ error: 'Failed to wire the Legacy Guide account' }, { status: 500 })
    }
  }

  // ── provision (default): create/reuse + upsert + wire + link ────────────────
  const name  = typeof body.name  === 'string' ? body.name.trim().slice(0, 100) : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  try {
    const result = await provisionGuide({ email, name })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[admin/guide] provision failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Failed to provision the Legacy Guide account' }, { status: 500 })
  }
}
