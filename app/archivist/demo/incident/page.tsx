import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import IncidentDemoClient from './IncidentDemoClient'

export const metadata: Metadata = { title: 'Incident Capture Demo' }

// A first meeting is Guide-run, so the incident capture demo sits behind the
// Guide portal session at the admin-strength standard (a real Supabase session,
// not the deprecated cookie-presence path). The session itself is transient and
// lives only in the browser: nothing is written to any archive.
export default async function IncidentDemoPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <IncidentDemoClient />
}
