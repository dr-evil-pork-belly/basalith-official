import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import LeaderboardClient from './LeaderboardClient'

export default async function ArchivistLeaderboardPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <LeaderboardClient archivistId={session.archivistId} />
}
