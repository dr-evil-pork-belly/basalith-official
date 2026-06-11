import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import EntityClient from './EntityClient'

export const metadata: Metadata = {
  title: 'Your Entity',
}

export default async function EntityPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <EntityClient archiveId={session.archiveId} />
}
