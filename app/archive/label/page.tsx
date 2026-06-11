import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import LabelClient from './LabelClient'

export const metadata: Metadata = { title: 'Upload' }

export default async function ArchiveLabelPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <LabelClient archiveId={session.archiveId} />
}
