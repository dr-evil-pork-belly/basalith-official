import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { getCertModule } from '@/lib/certificationContent'
import ExamClient from './ExamClient'

export function generateStaticParams() {
  return [{ module: '1' }, { module: '2' }, { module: '3' }]
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const { module: m } = await params
  const mod = getCertModule(parseInt(m, 10))
  return { title: mod ? `Exam · ${mod.title} — Guide Portal` : 'Exam — Basalith' }
}

export default async function ExamPage({ params }: { params: Promise<{ module: string }> }) {
  const { module: moduleParam } = await params
  const cookieStore = await cookies()
  const archivistId = cookieStore.get('archivist-id')?.value
  if (!archivistId) redirect('/archivist-login')

  const moduleNumber = parseInt(moduleParam, 10)
  const mod          = getCertModule(moduleNumber)
  if (!mod) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  let certStatus: Record<string, unknown> = {}
  try {
    const res = await fetch(`${baseUrl}/api/archivist/certification?archivistId=${archivistId}`, { cache: 'no-store' })
    if (res.ok) certStatus = await res.json()
  } catch {}

  const statusKey = `module_${moduleNumber}_status` as keyof typeof certStatus
  const status    = String(certStatus[statusKey] ?? (moduleNumber === 1 ? 'available' : 'locked'))
  const retryAt   = certStatus.retry_available_at as string | null ?? null

  if (status === 'locked') redirect('/archivist/certification')

  // Enforce retry cooldown
  if (status === 'failed' && retryAt) {
    const diff = new Date(retryAt).getTime() - Date.now()
    if (diff > 0) redirect(`/archivist/certification?retry=${moduleNumber}`)
  }

  return (
    <ExamClient
      archivistId={archivistId}
      mod={mod}
      moduleNumber={moduleNumber}
      status={status}
    />
  )
}
