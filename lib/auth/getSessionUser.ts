import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export type SessionRole = 'owner' | 'guide' | 'successor' | 'admin' | null

export interface SessionUser {
  userId:       string
  email:        string | null
  role:         SessionRole
  archiveId?:   string | null
  archivistId?: string | null
  successorId?: string | null
}

// Reads the current Supabase Auth session and resolves it to a Basalith
// identity. Returns null if there is no authenticated user.
//
// Role comes from the user's app_metadata.role (set by the Phase 3
// backfill and on user creation). There is no separate roles table.
//
// Scope fields (archiveId, archivistId, successorId) are resolved from the
// linkage columns added in Phase 2 (archives.owner_user_id,
// archivists.auth_user_id, successors.auth_user_id). Until the Phase 3
// backfill runs, these columns are empty for existing rows, so the scope
// fields will be null even for a valid, logged-in user. That is expected
// for this phase.
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
  // archive-id cookie (set by /api/archive/switch) names one of this user's
  // own archives, use that as the active one instead.
  const ownedArchives = archiveRes.data ?? []
  let archiveId = ownedArchives[0]?.id ?? null
  if (ownedArchives.length > 1) {
    const selected = (await cookies()).get('archive-id')?.value
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
