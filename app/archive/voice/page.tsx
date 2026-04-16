import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import VoiceClient from './VoiceClient'

export const metadata: Metadata = { title: 'Voice' }

export default async function VoicePage() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) redirect('/archive-login')
  return <VoiceClient archiveId={archiveId} />
}
