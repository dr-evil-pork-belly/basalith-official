import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = { title: 'Archivist Dashboard' }

export default async function ArchivistDashboardPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <DashboardClient archivistId={archivistId} />
}
