import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ContributorsClient from './ContributorsClient'

export default async function ArchiveContributorsPage() {
  const cookieStore = await cookies()
  const archiveId = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <ContributorsClient archiveId={archiveId} />
}
