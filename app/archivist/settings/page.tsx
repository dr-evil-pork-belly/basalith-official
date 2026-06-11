import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Settings — Basalith Guide Portal' }

export default async function SettingsPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <SettingsClient archivistId={session.archivistId} />
}
