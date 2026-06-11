import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import OnboardClient from './OnboardClient'

export default async function OnboardPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <OnboardClient archivistId={session.archivistId} />
}
