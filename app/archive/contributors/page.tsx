import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import ContributorsClient from './ContributorsClient'

export const metadata: Metadata = { title: 'Contributors' }

export default async function ArchiveContributorsPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <ContributorsClient archiveId={session.archiveId} />
}
