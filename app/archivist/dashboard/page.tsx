import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = { title: 'Legacy Guide Dashboard' }

export default async function ArchivistDashboardPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <DashboardClient archivistId={session.archivistId} />
}
