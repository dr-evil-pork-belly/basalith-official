import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import DemoClient from './DemoClient'

export const metadata: Metadata = { title: 'Live Demo' }

// The demo is run by a certified Legacy Guide, so it sits behind the Guide
// portal session. The experience itself is full-screen and ephemeral.
export default async function ArchivistDemoPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <DemoClient />
}
