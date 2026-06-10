import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GuideOnboardClient from './GuideOnboardClient'

// Invite-code gated. A Guide who is already signed in goes straight to
// their dashboard rather than creating a second account.
export default async function GuideOnboardPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (archivistId) redirect('/archivist/dashboard')
  return <GuideOnboardClient />
}
