import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import EarningsClient from './EarningsClient'

export default async function ArchivistEarningsPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <EarningsClient archivistId={session.archivistId} />
}
