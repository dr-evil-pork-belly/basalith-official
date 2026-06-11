import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import WisdomClient from './WisdomClient'

export const metadata: Metadata = { title: 'Wisdom Sessions' }

export default async function WisdomPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <WisdomClient archiveId={session.archiveId} />
}
