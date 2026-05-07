import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CertificationClient from './CertificationClient'

export const metadata = { title: 'Certification — Basalith Guide Portal' }

export default async function CertificationPage() {
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')
  return <CertificationClient archivistId={archivistId} />
}
