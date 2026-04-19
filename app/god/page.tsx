import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import GodModeClient from './GodModeClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'God Mode',
  robots: { index: false, follow: false },
}

export default async function GodModePage() {
  const cookieStore = await cookies()
  const auth        = cookieStore.get('god-mode-auth')?.value
  const expected    = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''

  if (!expected || auth !== expected) {
    redirect('/god/login')
  }

  return <GodModeClient />
}
