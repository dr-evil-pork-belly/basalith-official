import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { archiveHasPaid, ownerReferralCode } from '@/lib/referral'
import ContributorsClient from './ContributorsClient'

export const metadata: Metadata = { title: 'Contributors' }

export default async function ArchiveContributorsPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  // The referral link (October 6, 2026) is offered only to a Basalith that has
  // paid. The credit it earns comes off a renewal, and a Basalith with no
  // subscription has none. Decided on the server so the client never guesses.
  const paid = await archiveHasPaid(session.archiveId)
  const referralPath = paid ? `/begin?ref=${ownerReferralCode(session.archiveId)}` : null

  return <ContributorsClient archiveId={session.archiveId} referralPath={referralPath} />
}
