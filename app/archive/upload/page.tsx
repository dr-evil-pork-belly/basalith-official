import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UploadClient from './UploadClient'

export default async function UploadPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value

  if (!archiveId) redirect('/archive-login')

  return <UploadClient archiveId={archiveId} />
}
