import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import OnboardClient from './OnboardClient'

export default async function OnboardPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <OnboardClient archivistId={archivistId} />
}
