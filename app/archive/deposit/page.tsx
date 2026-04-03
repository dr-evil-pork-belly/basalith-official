import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DepositClient from './DepositClient'

export default async function DepositPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <DepositClient archiveId={archiveId} />
}
