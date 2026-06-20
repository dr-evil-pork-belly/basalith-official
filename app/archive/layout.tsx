import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ArchiveLayoutClient from './ArchiveLayoutClient'

// Resolve the active archive's tier server-side so the nav can trim itself for
// succession archives. archiveId comes from the session, never the client.
export default async function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser()

  let tier: string | null = null
  if (session?.archiveId) {
    const { data } = await supabaseAdmin
      .from('archives')
      .select('tier')
      .eq('id', session.archiveId)
      .maybeSingle()
    tier = data?.tier ?? null
  }

  return <ArchiveLayoutClient tier={tier}>{children}</ArchiveLayoutClient>
}
