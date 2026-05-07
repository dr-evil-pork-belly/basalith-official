import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Settings — Basalith Guide Portal' }

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <SettingsClient archivistId={archivistId} />
}
