import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import DepositClient from './DepositClient'

export default async function DepositPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <DepositClient archiveId={session.archiveId} />
}
