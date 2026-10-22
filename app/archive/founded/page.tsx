import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe/client'
import { getFoundingStatus } from '@/lib/foundingSequence'
import FoundedClient from './FoundedClient'

export const dynamic = 'force-dynamic'

// Where Stripe Checkout returns a trial owner who has just paid
// (success_url in app/api/archive/checkout). Slice C, October 9, 2026.
//
// THIS PAGE WRITES NOTHING. The record is founded by the Stripe webhook and
// the Inngest function, and this page only reports what it can see:
//
//   the record is already active and was a trial    "Your Basalith is founded."
//   still a trial, and Stripe says this session,
//   for this record, is paid                        "confirming", and the client
//                                                   asks again every few seconds,
//                                                   then once of the fallback
//                                                   (/api/archive/checkout/confirm)
//   anything else                                   back to the founding page
//
// The session id in the URL proves nothing by being there. It is looked up in
// Stripe, and it must name this owner's record in its metadata and be paid.
export default async function FoundedPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, owner_name, tier, status, converted_at')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (!archive || archive.owner_user_id !== session.userId) redirect('/archive-login')

  const founded = archive.status === 'active' && !!archive.converted_at
  let verifiedSessionId: string | null = null

  if (!founded) {
    if (archive.status !== 'trial') redirect('/archive/dashboard')
    const { session_id } = await searchParams
    const sessionId = typeof session_id === 'string' && /^cs_[A-Za-z0-9_]{10,200}$/.test(session_id) ? session_id : null
    if (!sessionId) redirect('/archive/founding')

    let paid = false
    try {
      const checkout = await getStripe().checkout.sessions.retrieve(sessionId)
      paid = checkout.metadata?.archive_id === archive.id && checkout.payment_status === 'paid'
    } catch (err) {
      console.error('[archive/founded] session lookup failed:', err instanceof Error ? err.message : err)
    }
    if (!paid) redirect('/archive/founding')
    verifiedSessionId = sessionId
  }

  // Where to go from here: the next founding call, or the dashboard when all
  // three are done. A failed read falls back to the founding page, which
  // sorts it out itself.
  let nextCall: 1 | 2 | 3 | null = 1
  let sequenceRead = false
  try {
    const status = await getFoundingStatus(archive.id, archive.tier)
    nextCall = status.nextCall
    sequenceRead = true
  } catch (err) {
    console.error('[archive/founded] founding status failed:', err instanceof Error ? err.message : err)
  }

  const firstName = archive.owner_name?.trim().split(/\s+/)[0] ?? null

  return (
    <FoundedClient
      initiallyFounded={founded}
      sessionId={verifiedSessionId}
      firstName={firstName}
      nextCall={sequenceRead ? nextCall : 1}
      sequenceDone={sequenceRead && nextCall === null}
    />
  )
}
