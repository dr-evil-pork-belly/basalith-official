import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import PipelineClient from './PipelineClient'

export default async function ArchivistPipelinePage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <PipelineClient archivistId={session.archivistId} />
}
