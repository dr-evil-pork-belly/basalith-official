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
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // ── Diagnostic logging — permanent, do not remove ──────────────────────────
  console.log('[contribute] token:', token?.substring(0, 10), '| length:', token?.length)

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch WITHOUT status filter so we can see the actual status in logs
  const { data: contributor, error: contribError } = await admin
    .from('contributors')
    .select('*')
    .eq('access_token', token)
    .maybeSingle()

  console.log('[contribute] contributor:', contributor?.id, '| status:', contributor?.status, '| error:', contribError?.message ?? null)

  if (!contributor || contributor.status !== 'active') {
    console.log('[contribute] notFound because:', !contributor ? 'no contributor found for token' : `contributor status is "${contributor.status}" (not active)`)
    return notFound()
  }

  const { data: archive, error: archiveError } = await admin
    .from('archives')
    .select('id, name, family_name, owner_name, status, contributor_entity_access, entity_preview_contributor_ids')
    .eq('id', contributor.archive_id)
    .maybeSingle()

  console.log('[contribute] archive:', archive?.id, '| status:', archive?.status, '| error:', archiveError?.message ?? null)

  if (!archive || archive.status !== 'active') {
    console.log('[contribute] notFound because:', !archive ? 'no archive found' : `archive status is "${archive.status}" (not active)`)
    return notFound()
  }

  // Update last accessed (non-blocking)
  void admin
    .from('contributors')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', contributor.id)

  console.log('[contribute] rendering portal for contributor:', contributor.id)

  return (
    <ContributeClient
      token={token}
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
        phone:              contributor.phone               ?? null,
        preferred_language: contributor.preferred_language  ?? 'en',
      }}
      archive={{
        id:                             archive.id,
        name:                           archive.name,
        family_name:                    archive.family_name,
        owner_name:                     archive.owner_name ?? '',
        contributor_entity_access:      (archive.contributor_entity_access ?? 'none') as 'none' | 'preview' | 'open',
        entity_preview_contributor_ids: archive.entity_preview_contributor_ids ?? [],
      }}
    />
  )
}
