import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import SuccessionDemoClient from './SuccessionDemoClient'

export const metadata: Metadata = { title: 'Succession Demo' }

// Read-only, boardroom-ready walkthrough of the B2B succession product.
// Fully scripted from a fictional founder persona. Behind the Guide session.
export default async function SuccessionDemoPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <SuccessionDemoClient />
}
