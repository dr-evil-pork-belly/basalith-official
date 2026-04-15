import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'Your Archive',
}

export default async function ArchiveDashboardPage() {
  const cookieStore = await cookies()
  const archiveId = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <DashboardClient archiveId={archiveId} />
}
