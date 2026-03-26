import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EarningsClient from './EarningsClient'

export default async function ArchivistEarningsPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <EarningsClient archivistId={archivistId} />
}
