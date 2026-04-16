import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import WisdomClient from './WisdomClient'

export const metadata: Metadata = { title: 'Wisdom Sessions' }

export default async function WisdomPage() {
  const cookieStore = await cookies()
  const archiveId = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <WisdomClient archiveId={archiveId} />
}
