/**
 * Legacy archive activation — compatibility shim for the manual admin override
 * (x-manual-secret) and any pre-slice Stripe payment link that carries
 * metadata.archiveId.
 *
 * The original pre-slice version read archives.submitted_by and archives.billing.
 * Neither column exists in this database (the 20260429 migration that would add
 * them was never applied), so that version returned 404 on every call. This is a
 * schema-correct minimal replacement: it activates the archive, reactivates
 * credentials, regenerates the login password, and emails the owner + admin.
 * The guide commission is intentionally not handled here — the new paid flow
 * (provisionOnFoundingFee) owns commissions.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { buildFoundingWelcomeEmail } from '@/lib/emails/foundingWelcome'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'

const TIER_LABELS: Record<string, string> = {
  archive: 'The Archive',
  estate:  'The Estate',
  dynasty: 'The Dynasty',
}

export type ActivationResult = { status: number; json: Record<string, unknown> }

export async function activateArchiveById(archiveId: string): Promise<ActivationResult> {
  const { data: archive, error } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_email, owner_name, tier, status, magic_link_token, preferred_language, resume_count')
    .eq('id', archiveId)
    .single()

  if (error || !archive) return { status: 404, json: { error: 'Archive not found' } }
  if (archive.status === 'active') return { status: 200, json: { ok: true, alreadyActive: true } }

  const isResume = archive.status === 'paused'

  await supabaseAdmin
    .from('archives')
    .update({
      status:    'active',
      paused_at: null,
      ...(isResume ? { resume_count: ((archive as any).resume_count ?? 0) + 1 } : {}),
    })
    .eq('id', archiveId)

  await supabaseAdmin
    .from('archive_credentials')
    .update({ is_active: true })
    .eq('archive_id', archiveId)
    .then(() => {})

  // Regenerate the login password (the stored hash is not recoverable).
  const { default: bcrypt } = await import('bcryptjs')
  const familyName  = archive.family_name ?? ''
  const newPassword = `${familyName.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '')}${new Date().getFullYear()}${Math.random().toString(36).slice(2, 6).toUpperCase()}!`
  const newHash     = await bcrypt.hash(newPassword, 12)
  await supabaseAdmin
    .from('archive_credentials')
    .update({ password_hash: newHash })
    .eq('archive_id', archiveId)
    .then(() => {})

  const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
  const magicLinkUrl = archive.magic_link_token
    ? `${siteUrl}/api/archive/magic-login?token=${archive.magic_link_token}`
    : null
  const clientName = archive.owner_name ?? familyName
  const firstName  = clientName.split(' ')[0]
  const tierLabel  = TIER_LABELS[archive.tier] ?? 'The Estate'

  // Client welcome (reuse the copy-checked founding welcome template).
  try {
    const email = buildFoundingWelcomeEmail({
      familyName,
      firstName,
      guideName:    null,
      tierLabel,
      magicLinkUrl,
      password:     newPassword,
      loginUrl:     `${siteUrl}/archive-login`,
    })
    await resend.emails.send({
      from:    `The ${familyName} Archive <${RESEND_FROM}>`,
      to:      archive.owner_email,
      subject: email.subject,
      html:    email.html,
      text:    email.text,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-manual-act-${archiveId}`,
        'Precedence':       'bulk',
      },
    })
  } catch (e) {
    console.error('[legacyActivation] client welcome email failed:', e)
  }

  // Admin notice.
  try {
    await resend.emails.send({
      from:    `Basalith <${RESEND_FROM}>`,
      to:      ADMIN_EMAIL,
      subject: `Archive activated (manual) — The ${familyName} Archive`,
      headers: { 'X-Entity-Ref-ID': `basalith-manual-admin-${archiveId}` },
      html:    `<p>Archive ${archiveId} (The ${familyName} Archive) was activated via the manual override.</p>
        <p>Owner: ${archive.owner_email}</p><p>Resume: ${isResume ? 'yes' : 'no'}</p>`,
    })
  } catch (e) {
    console.error('[legacyActivation] admin notice email failed:', e)
  }

  return { status: 200, json: { ok: true, archiveId, activated: true, resumed: isResume } }
}
