import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LabelClient from './LabelClient'

export const metadata: Metadata = { title: 'Upload' }

export default async function ArchiveLabelPage() {
  const cookieStore = await cookies()
  const archiveId = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <LabelClient archiveId={archiveId} />
}
