import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { scopeForTier } from '@/lib/foundingSequence'
import { isTrial } from '@/lib/trial'
import { isAssessment } from '@/lib/assessment'
import { needsBusinessProfile } from '@/lib/businessProfileStore'
import { loadTrialOffer } from '@/lib/trialCheckoutStore'
import FoundingClient from './FoundingClient'

// The Founding Sequence. Three incident interviews the owner runs in their own
// time, by voice or typed, in place of the live Founding Session. Owner-only:
// the archive comes from the session, and the tier only picks the seed set.
export default async function FoundingPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/begin?signed_in=1')

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, owner_name, owner_email, status, scheduled_deletion_at, termination_requested_at, preferred_language')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) redirect('/archive-login')

  // An owner describes his business before his first call, when the owner
  // openers are on for him (lib/businessProfile.ts, October 28, 2026). A
  // personal record never qualifies, so a trial is never sent there.
  if (await needsBusinessProfile(archive)) redirect('/archive/business')

  // ?area=Money from the coverage map opens one area call (lib/areaCalls.ts).
  // Validated against the archive's own taxonomy by the start route.
  const { area } = await searchParams
  const requestedArea = typeof area === 'string' && area.trim() ? area.trim().slice(0, 40) : null

  // An assessment record runs area calls only, never the Founding Sequence
  // (decided October 8, 2026). Without an area there is nothing here for it.
  const assessment = isAssessment(archive)
  if (assessment && !requestedArea) redirect('/archive/assessment')

  // Trial to paid (slice C, October 9, 2026). Null means no button: Checkout
  // is closed to this owner, a price is missing, or the record is not a
  // personal trial. The page then shows what it showed before.
  const trial = isTrial(archive)
  const offer = trial ? await loadTrialOffer(archive) : null

  return (
    <FoundingClient
      archiveId={archive.id}
      scope={scopeForTier(archive.tier)}
      ownerName={archive.owner_name ?? null}
      area={requestedArea}
      trial={trial}
      offer={offer}
      assessment={assessment}
    />
  )
}
