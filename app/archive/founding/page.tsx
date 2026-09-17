import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { scopeForTier } from '@/lib/foundingSequence'
import FoundingClient from './FoundingClient'

// The Founding Sequence. Three incident interviews the owner runs in their own
// time, by voice or typed, in place of the live Founding Session. Owner-only:
// the archive comes from the session, and the tier only picks the seed set.
export default async function FoundingPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/begin?signed_in=1')

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, tier, owner_name')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) redirect('/archive-login')

  // ?area=Money from the coverage map opens one area call (lib/areaCalls.ts).
  // Validated against the archive's own taxonomy by the start route.
  const { area } = await searchParams
  const requestedArea = typeof area === 'string' && area.trim() ? area.trim().slice(0, 40) : null

  return (
    <FoundingClient
      archiveId={archive.id}
      scope={scopeForTier(archive.tier)}
      ownerName={archive.owner_name ?? null}
      area={requestedArea}
    />
  )
}
