import { supabaseAdmin } from '@/lib/supabase-admin'

// Referral, October 6, 2026. See docs/LAUNCH_REVENUE_2026-10-06.md, section 8.
//
// The rule: a referred personal client pays half the founding fee, $1,250.
// When that client pays, the Basalith that referred them is owed a $500 credit
// against its next renewal.
//
// Two links carry a referral to /begin.
//
//   /begin?ref=<contributors.id>      from the contributor page
//   /begin?ref=o-<archives.id>        from the owner's Contributors page
//
// Both are row ids, never the contributor access token: the token is a
// credential and does not belong in a query string.
//
// This file resolves a code to a referring Basalith, or to null. It grants
// nothing by itself. It decides whether /begin shows the referral line and
// what the trial start route records. The price is applied at checkout with
// referralFounding, and the credit is written by provisionOnFoundingFee.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OWNER_PREFIX = 'o-'

export const REFERRAL_FOUNDING_DOLLARS = 1250
export const REFERRAL_CREDIT_CENTS = 50000

export type Referral =
  | { kind: 'contributor'; contributorId: string; archiveId: string }
  | { kind: 'owner'; archiveId: string }

/** The code an owner's referral link carries. */
export function ownerReferralCode(archiveId: string): string {
  return `${OWNER_PREFIX}${archiveId}`
}

async function activeArchive(archiveId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('archives')
    .select('id, status')
    .eq('id', archiveId)
    .maybeSingle()
  return !!data && data.status === 'active'
}

/**
 * True when the Basalith has paid. An owner link only resolves for one that
 * has, because the credit it earns is taken off a renewal, and a Basalith with
 * no subscription has no renewal.
 */
export async function archiveHasPaid(archiveId: string): Promise<boolean> {
  if (!UUID.test(archiveId)) return false
  try {
    const { data } = await supabaseAdmin
      .from('billing')
      .select('archive_id, founding_paid_at')
      .eq('archive_id', archiveId)
      .not('founding_paid_at', 'is', null)
      .limit(1)
    return !!data && data.length > 0
  } catch {
    return false
  }
}

export async function resolveReferral(raw: unknown): Promise<Referral | null> {
  if (typeof raw !== 'string') return null
  try {
    if (raw.startsWith(OWNER_PREFIX)) {
      const archiveId = raw.slice(OWNER_PREFIX.length)
      if (!UUID.test(archiveId)) return null
      if (!(await activeArchive(archiveId))) return null
      if (!(await archiveHasPaid(archiveId))) return null
      return { kind: 'owner', archiveId }
    }

    if (!UUID.test(raw)) return null
    const { data: contributor } = await supabaseAdmin
      .from('contributors')
      .select('id, archive_id, status')
      .eq('id', raw)
      .maybeSingle()
    if (!contributor || contributor.status !== 'active' || !contributor.archive_id) return null
    if (!(await activeArchive(contributor.archive_id))) return null
    return { kind: 'contributor', contributorId: contributor.id, archiveId: contributor.archive_id }
  } catch {
    // A failed lookup means no referral. It never blocks a person from beginning.
    return null
  }
}

// The referral rides in archive_applications.reason as a bracketed tag, because
// that column is free text and the CHECK constraints on referral_source have
// not been read. One writer, one reader, both here.

export function referralTag(r: Referral): string {
  return r.kind === 'owner'
    ? `[referred by owner archive ${r.archiveId}]`
    : `[referred by contributor ${r.contributorId} archive ${r.archiveId}]`
}

const TAG = /\[referred by (?:owner|contributor [0-9a-f-]{36}) archive ([0-9a-f-]{36})\]/i

/** The referring Basalith recorded on an application, or null. */
export function referrerArchiveFromReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return null
  const m = reason.match(TAG)
  return m && UUID.test(m[1]) ? m[1] : null
}
