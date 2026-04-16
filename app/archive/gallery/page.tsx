import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import GalleryClient from './GalleryClient'

export const metadata: Metadata = { title: 'Gallery' }

export default async function ArchiveGalleryPage() {
  const cookieStore = await cookies()
  const archiveId = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <GalleryClient archiveId={archiveId} />
}
