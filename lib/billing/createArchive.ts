import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAuthUser } from '@/lib/auth/getOrCreateAuthUser'
import bcrypt from 'bcryptjs'

/**
 * Shared archive provisioning core. Extracted from app/api/archivist/
 * onboard-client/route.ts so the manual onboarding path and the paid Stripe
 * provisioning path (Inngest provisionOnFoundingFee) create archives the same
 * way. Behavior is identical to the original onboard-client steps 2-4b.
 *
 * Creates: the archives row, the archive_credentials row (mobile-login shim),
 * the Supabase Auth user, and a magic link. Does NOT write commissions,
 * prospects, lifecycle, billing, or send any email — each caller owns those,
 * because they differ between the manual and paid flows.
 */

// Mobile login (app/api/archive/mobile-login) still authenticates with
// archive_credentials + a password, so a password is generated and stored for
// that shim. The web portal is magic-link only.
function generateClientPassword(familyName: string): string {
  const clean = familyName.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${clean}${new Date().getFullYear()}${suffix}!`
}

export type CreatedArchive = {
  archiveId: string
  archive: Record<string, any>
  password: string
  ownerUserId: string | null
  magicLinkUrl: string | null
}

export async function createArchiveWithCredentials(input: {
  familyName: string
  ownerEmail: string
  ownerName?: string | null
  tier: string
  /** archive_credentials.created_by (the guide/archivist who provisioned). */
  credentialsCreatedBy?: string | null
}): Promise<CreatedArchive> {
  const { familyName, ownerEmail, ownerName, tier, credentialsCreatedBy } = input

  const password     = generateClientPassword(familyName)
  const passwordHash = await bcrypt.hash(password, 12)

  // ── archives row ────────────────────────────────────────────────────────
  // Mirrors the original onboard-client insert exactly. Note: archives has no
  // submitted_by column in this database (the 20260429 migration that would add
  // it was never applied), so the guide link lives on archive_credentials and
  // on the commission, not on the archive row.
  const { data: archive, error: archiveError } = await supabaseAdmin
    .from('archives')
    .insert({
      name:        `The ${familyName} Archive`,
      family_name: familyName,
      owner_email: ownerEmail,
      owner_name:  ownerName || null,
      tier,
      generation:  'Generation I',
      status:      'active',
    })
    .select()
    .single()

  if (archiveError || !archive) {
    throw new Error(archiveError?.message || 'Failed to create archive')
  }

  // ── credentials (mobile-login shim) ─────────────────────────────────────
  const { error: credError } = await supabaseAdmin
    .from('archive_credentials')
    .insert({
      archive_id:    archive.id,
      password_hash: passwordHash,
      created_by:    credentialsCreatedBy ?? null,
      is_active:     true,
    })

  if (credError) throw new Error('Failed to store credentials: ' + credError.message)

  // ── owner auth user + link ──────────────────────────────────────────────
  const ownerUserId = await getOrCreateAuthUser(ownerEmail, 'owner')

  const { error: ownerLinkError } = await supabaseAdmin
    .from('archives')
    .update({ owner_user_id: ownerUserId })
    .eq('id', archive.id)

  if (ownerLinkError) throw new Error('Failed to link owner account: ' + ownerLinkError.message)

  // ── magic link (non-fatal) ──────────────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
  let magicLinkUrl: string | null = null
  try {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type:  'magiclink',
      email: ownerEmail,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    })
    if (linkError) throw linkError
    magicLinkUrl = linkData.properties?.action_link ?? null
  } catch (linkErr: unknown) {
    console.error('[createArchive] Magic link generation failed:', linkErr instanceof Error ? linkErr.message : linkErr)
    // Non-fatal — owner can still request a sign-in link at /archive-login
  }

  return { archiveId: archive.id, archive, password, ownerUserId, magicLinkUrl }
}
