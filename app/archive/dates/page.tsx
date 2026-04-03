import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DatesClient from './DatesClient'

export default async function DatesPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <DatesClient archiveId={archiveId} />
}
