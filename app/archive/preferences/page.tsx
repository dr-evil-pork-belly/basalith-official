import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PreferencesClient from './PreferencesClient'

export default async function ArchivePreferencesPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <PreferencesClient archiveId={archiveId} />
}
