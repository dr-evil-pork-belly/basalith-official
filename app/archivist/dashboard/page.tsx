import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function ArchivistDashboardPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <DashboardClient archivistId={archivistId} />
}
