import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import GalleryClient from './GalleryClient'

export const metadata: Metadata = { title: 'Gallery' }

export default async function ArchiveGalleryPage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <GalleryClient archiveId={session.archiveId} />
}
