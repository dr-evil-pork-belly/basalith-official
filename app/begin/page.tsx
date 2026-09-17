import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import BeginClient from './BeginClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The first call',
  description: 'Tell us about the hardest call you ever made. Fifteen to thirty minutes, by voice or typed, on your own time.',
}

// The self-serve front door. Three states, decided here from the session so
// the client never guesses:
//   signed in with an archive     -> the dashboard, as the callback does
//   signed in without an archive  -> the form minus email (the only surface a
//                                    zero-archive owner ever lands on, recon B3)
//   no session                    -> the public form
// ?signed_in=1 from the dashboard and founding redirects is informational; the
// session decides.
export default async function BeginPage() {
  const session = await getSessionUser()
  if (session?.archiveId) redirect('/archive/dashboard')

  return (
    <BeginClient
      signedInEmail={session?.email ?? null}
    />
  )
}
