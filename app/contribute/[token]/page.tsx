import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ContributeClient from './ContributeClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contributor Portal',
  robots: { index: false, follow: false },
}

export default async function ContributePage({
  params,
}: {
  params: { token: string }
}) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: contributor } = await admin
    .from('contributors')
    .select('*')
    .eq('access_token', params.token)
    .eq('status', 'active')
    .maybeSingle()

  if (!contributor) return notFound()

  const { data: archive } = await admin
    .from('archives')
    .select('id, name, family_name, owner_name, status')
    .eq('id', contributor.archive_id)
    .maybeSingle()

  if (!archive || archive.status !== 'active') return notFound()

  // Update last accessed (non-blocking)
  void admin
    .from('contributors')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', contributor.id)

  return (
    <ContributeClient
      token={params.token}
      contributor={{
        id:                 contributor.id,
        name:               contributor.name               ?? '',
        email:              contributor.email,
        relationship:       contributor.relationship        ?? 'other',
        photos_uploaded:    contributor.photos_uploaded     ?? 0,
        videos_uploaded:    contributor.videos_uploaded     ?? 0,
        voice_recordings:   contributor.voice_recordings    ?? 0,
        questions_answered: contributor.questions_answered  ?? 0,
        photos_labelled:    contributor.photos_labelled     ?? 0,
      }}
      archive={{
        id:          archive.id,
        name:        archive.name,
        family_name: archive.family_name,
        owner_name:  archive.owner_name ?? '',
      }}
    />
  )
}
