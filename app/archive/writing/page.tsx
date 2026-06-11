import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import WritingClient from './WritingClient'

export default async function WritingPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  return <WritingClient archiveId={session.archiveId} />
}
