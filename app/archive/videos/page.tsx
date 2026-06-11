import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import VideosClient from './VideosClient'

export default async function VideosPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  return <VideosClient archiveId={session.archiveId} />
}
