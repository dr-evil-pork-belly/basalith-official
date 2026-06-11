import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import PreferencesClient from './PreferencesClient'

export default async function ArchivePreferencesPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <PreferencesClient archiveId={session.archiveId} />
}
