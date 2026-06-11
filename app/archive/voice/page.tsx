import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import VoiceClient from './VoiceClient'

export const metadata: Metadata = { title: 'Voice' }

export default async function VoicePage() {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')
  return <VoiceClient archiveId={session.archiveId} />
}
