import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import VideosClient from './VideosClient'

export default async function VideosPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value

  if (!archiveId) redirect('/archive-login')

  return <VideosClient archiveId={archiveId} />
}
