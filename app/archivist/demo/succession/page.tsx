import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SuccessionDemoClient from './SuccessionDemoClient'

export const metadata: Metadata = { title: 'Succession Demo' }

// Read-only, boardroom-ready walkthrough of the B2B succession product.
// Fully scripted from a fictional founder persona. Behind the Guide session.
export default async function SuccessionDemoPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <SuccessionDemoClient />
}
