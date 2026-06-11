import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import MemoryMapClient from './MemoryMapClient'

export default async function MemoryMapPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <MemoryMapClient />
}
