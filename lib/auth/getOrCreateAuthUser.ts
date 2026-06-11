import { supabaseAdmin } from '@/lib/supabase-admin'
import type { SessionRole } from '@/lib/auth/getSessionUser'

// Creates a Supabase Auth user for the given email with email_confirm true
// and app_metadata.role set, or returns the id of the existing user if one
// is already registered with that email. No password is set; the user signs
// in by magic link.
export async function getOrCreateAuthUser(email: string, role: Exclude<SessionRole, null>): Promise<string> {
  const normalized = email.trim().toLowerCase()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    app_metadata: { role },
  })

  if (!error && data.user) return data.user.id

  // User already exists — find them and make sure the role is set.
  const perPage = 1000
  for (let page = 1; ; page++) {
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (listError) throw new Error(`Failed to look up existing auth user for ${normalized}: ${listError.message}`)

    const match = list.users.find(u => u.email?.toLowerCase() === normalized)
    if (match) {
      if (!match.app_metadata?.role) {
        await supabaseAdmin.auth.admin.updateUserById(match.id, {
          app_metadata: { ...match.app_metadata, role },
        })
      }
      return match.id
    }

    if (list.users.length < perPage) break
  }

  throw new Error(`Could not create or find an auth user for ${normalized}: ${error?.message ?? 'unknown error'}`)
}
