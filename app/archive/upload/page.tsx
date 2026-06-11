import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import UploadClient from './UploadClient'

export default async function UploadPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  return <UploadClient archiveId={session.archiveId} />
}
