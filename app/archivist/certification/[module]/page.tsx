import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { getCertModule } from '@/lib/certificationContent'
import ModuleClient from './ModuleClient'

export function generateStaticParams() {
  return [{ module: '1' }, { module: '2' }, { module: '3' }]
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const { module: m } = await params
  const mod = getCertModule(parseInt(m, 10))
  return { title: mod ? `${mod.title} — Guide Portal` : 'Module — Basalith' }
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleParam } = await params
  const session = await getSessionUser()
  if (!session?.archivistId) redirect('/archivist-login')
  const archivistId = session.archivistId

  const moduleNumber = parseInt(moduleParam, 10)
  const mod          = getCertModule(moduleNumber)
  if (!mod) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  let certStatus: Record<string, string> = {}
  try {
    const res = await fetch(`${baseUrl}/api/archivist/certification?archivistId=${archivistId}`, { cache: 'no-store' })
    if (res.ok) certStatus = await res.json()
  } catch {}

  const statusKey = `module_${moduleNumber}_status` as keyof typeof certStatus
  const status    = certStatus[statusKey] ?? (moduleNumber === 1 ? 'available' : 'locked')

  if (status === 'locked') redirect('/archivist/certification')

  return (
    <ModuleClient
      archivistId={archivistId}
      mod={mod}
      status={status}
      moduleNumber={moduleNumber}
    />
  )
}
