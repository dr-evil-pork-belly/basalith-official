import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'Your Archive',
}

export default async function ArchiveDashboardPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/begin?signed_in=1')
  return <DashboardClient archiveId={session.archiveId} />
}
