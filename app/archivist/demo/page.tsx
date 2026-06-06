import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DemoClient from './DemoClient'

export const metadata: Metadata = { title: 'Live Demo' }

// The demo is run by a certified Legacy Guide, so it sits behind the Guide
// portal session. The experience itself is full-screen and ephemeral.
export default async function ArchivistDemoPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <DemoClient />
}
