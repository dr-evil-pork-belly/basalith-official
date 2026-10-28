import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PROFILE_QUESTIONS, profileApplies, profileNext } from '@/lib/businessProfile'
import { isAssessment } from '@/lib/assessment'
import { loadBusinessProfile } from '@/lib/businessProfileStore'
import BusinessClient from './BusinessClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your business',
}

// The business profile, first screen of the portal for an owner
// (lib/businessProfile.ts). October 28, 2026. Owner only: the record comes
// from the session. A record the screen does not apply to, or one that has
// already answered, goes on to its own page. ?edit=1 lets an owner who has
// answered write again; the newest answer is the one the openers read.
//
// No loop: the pages that send an owner here (dashboard, assessment,
// founding) do so only when the profile is missing, and this page sends him
// on only when it is present or does not apply.
export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, status, preferred_language')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) redirect('/archive-login')
  const next = profileNext(archive)
  if (!profileApplies(archive)) redirect(next)

  const { edit } = await searchParams
  const profile = await loadBusinessProfile(archive.id).catch(() => null)
  if (profile && edit !== '1') redirect(next)

  return (
    <BusinessClient
      questions={PROFILE_QUESTIONS}
      initial={profile ? { business: profile.business, decisions: profile.decisions } : null}
      assessment={isAssessment(archive)}
    />
  )
}
