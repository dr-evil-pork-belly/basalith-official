import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAssessment } from '@/lib/assessment'
import ArchiveLayoutClient from './ArchiveLayoutClient'

// Resolve the active archive's tier server-side so the nav can trim itself for
// succession archives. archiveId comes from the session, never the client.
export default async function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser()

  let tier: string | null = null
  // An assessment record (lib/assessment.ts) gets one nav item, its own page.
  // The rest of the nav is a client's Basalith and none of it is theirs.
  let assessment = false
  if (session?.archiveId) {
    const { data } = await supabaseAdmin
      .from('archives')
      .select('tier, status')
      .eq('id', session.archiveId)
      .maybeSingle()
    tier = data?.tier ?? null
    assessment = !!data && isAssessment(data)
  }

  return <ArchiveLayoutClient tier={tier} assessment={assessment}>{children}</ArchiveLayoutClient>
}
