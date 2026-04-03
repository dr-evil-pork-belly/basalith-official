import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EntityClient from './EntityClient'

export default async function EntityPage() {
  const cookieStore = await cookies()
  const archiveId = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <EntityClient archiveId={archiveId} />
}
