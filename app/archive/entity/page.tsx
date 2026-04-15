import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EntityClient from './EntityClient'

export const metadata: Metadata = {
  title: 'Your Entity',
}

export default async function EntityPage() {
  const cookieStore = await cookies()
  const archiveId = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <EntityClient archiveId={archiveId} />
}
