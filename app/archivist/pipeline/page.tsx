import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PipelineClient from './PipelineClient'

export default async function ArchivistPipelinePage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <PipelineClient archivistId={archivistId} />
}
