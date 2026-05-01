import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MemoryMapClient from './MemoryMapClient'

export default async function MemoryMapPage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <MemoryMapClient />
}
