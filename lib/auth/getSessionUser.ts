import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies, headers } from 'next/headers'
import type { User } from '@supabase/supabase-js'

// 'contributor' is set on Auth users provisioned by /api/mobile/prepare-sign-in
// for family members invited to an archive. It grants nothing by itself: the
// contributor surface still authenticates on contributors.access_token, handed
// out by /api/mobile/contributor-session against the session email.
export type SessionRole = 'owner' | 'guide' | 'successor' | 'admin' | 'contributor' | null

export interface SessionUser {
  userId:       string
  email:        string | null
  role:         SessionRole
  archiveId?:   string | null
  archivistId?: string | null
  successorId?: string | null
}

// Header the iOS app sends to pick one of several owned archives. The web
// dashboard uses the archive-id cookie set by /api/archive/switch for the same
// purpose. Either value is only honoured when it names an archive this user
// owns; it never widens access.
export const ARCHIVE_SELECT_HEADER = 'x-archive-id'

// Resolves the caller from an `Authorization: Bearer <supabase access token>`
// header. This is how the iOS app authenticates: it holds a real Supabase Auth
// session (email OTP, see basalith-app/src/lib/supabase.ts) and forwards the
// access token on every request instead of a cookie jar.
//
// The token is verified server-side by Supabase Auth (`auth.getUser(jwt)`), so a
// forged or expired token resolves to null exactly like a missing cookie would.
//
// Contributor access tokens (`contributors.access_token`, 64 hex chars) also
// travel in the Authorization header on /api/archive/entity-chat. They are not
// JWTs, so they are skipped here and fall through to that route's own
// contributor branch, unchanged.
async function getUserFromBearer(): Promise<User | null> {
  let authHeader: string | null = null
  try {
    authHeader = (await headers()).get('authorization')
  } catch {
    // headers() is unavailable outside a request scope. Treat as no header.
    return null
  }
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) return null

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  // A JWT has exactly three dot-separated segments. Anything else is not ours.
  if (token.split('.').length !== 3) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// Reads the current Supabase Auth session and resolves it to a Basalith
// identity. Returns null if there is no authenticated user.
//
// Identity comes from one of two places, checked in this order:
//   1. Authorization: Bearer <access token>   (iOS app)
//   2. The Supabase Auth cookie               (web, via @supabase/ssr)
//
// Role comes from the user's app_metadata.role (set by the Phase 3
// backfill and on user creation). There is no separate roles table.
//
// Scope fields (archiveId, archivistId, successorId) are resolved from the
// linkage columns added in Phase 2 (archives.owner_user_id,
// archivists.auth_user_id, successors.auth_user_id).
export async function getSessionUser(): Promise<SessionUser | null> {
  let user: User | null = await getUserFromBearer()

  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) return null

  const role = (user.app_metadata?.role ?? null) as SessionRole

  const result: SessionUser = {
    userId: user.id,
    email:  user.email ?? null,
    role,
  }

  const [archiveRes, archivistRes, successorRes] = await Promise.all([
    supabaseAdmin.from('archives').select('id').eq('owner_user_id', user.id),
    supabaseAdmin.from('archivists').select('id').eq('auth_user_id', user.id).maybeSingle(),
    supabaseAdmin.from('successors').select('id, archive_id').eq('auth_user_id', user.id).maybeSingle(),
  ])

  // An owner can have more than one archive. Default to the first; if the
  // x-archive-id header (iOS) or the archive-id cookie (web, set by
  // /api/archive/switch) names one of this user's own archives, use that as the
  // active one instead. A value naming any other archive is ignored.
  const ownedArchives = archiveRes.data ?? []
  let archiveId = ownedArchives[0]?.id ?? null
  if (ownedArchives.length > 1) {
    let selected: string | null = null
    try {
      selected = (await headers()).get(ARCHIVE_SELECT_HEADER)
    } catch {}
    if (!selected) {
      try {
        selected = (await cookies()).get('archive-id')?.value ?? null
      } catch {}
    }
    if (selected && ownedArchives.some(a => a.id === selected)) {
      archiveId = selected
    }
  }

  result.archiveId   = archiveId
  result.archivistId = archivistRes.data?.id ?? null
  result.successorId = successorRes.data?.id ?? null

  // A successor owns no archive, so the owner path above leaves archiveId null
  // for them. Fall back to the archive their successor row is scoped to, so the
  // successor portal (which requires both successorId and archiveId) is
  // reachable. This never overrides an owner's resolved archive.
  if (result.successorId && !result.archiveId) {
    result.archiveId = successorRes.data?.archive_id ?? null
  }

  return result
}
