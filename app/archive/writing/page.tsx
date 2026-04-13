import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import WritingClient from './WritingClient'

export default async function WritingPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value

  if (!archiveId) redirect('/archive-login')

  return <WritingClient archiveId={archiveId} />
}
