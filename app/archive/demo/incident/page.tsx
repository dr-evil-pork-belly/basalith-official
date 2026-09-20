import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import IncidentDemoClient from './IncidentDemoClient'

export const metadata: Metadata = {
  title:  'Incident Capture Demo',
  robots: { index: false, follow: false },
}

// Moved out of the Guide-gated /archivist tree on September 20, 2026, when the
// Guide portal was retired. Unlike the consumer demo this one keeps its gate:
// its API is not public, so it moved to the owner session rather than opening
// up. Under /archive it is covered by the proxy.ts rule as well. The session
// itself is transient and lives only in the browser: nothing is written to any
// archive.
export default async function IncidentDemoPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <IncidentDemoClient />
}
