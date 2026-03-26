import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LeaderboardClient from './LeaderboardClient'

export default async function ArchivistLeaderboardPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <LeaderboardClient archivistId={archivistId} />
}
