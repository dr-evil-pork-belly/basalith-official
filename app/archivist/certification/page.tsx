import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import CertificationClient from './CertificationClient'

export const metadata = { title: 'Certification — Basalith Guide Portal' }

export default async function CertificationPage() {
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  return <CertificationClient archivistId={session.archivistId} />
}
