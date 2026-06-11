import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import DatesClient from './DatesClient'

export const metadata: Metadata = { title: 'Important Dates' }

export default async function DatesPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <DatesClient archiveId={session.archiveId} />
}
