import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assessmentAreas, isAssessment } from '@/lib/assessment'
import RoundClient from './RoundClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Six questions',
}

// The round of six for one area (lib/assessmentRound.ts). Slice 4b, October 8,
// 2026. Owner only, assessment records only. ?area= must be one of the eight;
// anything else goes back to the assessment page. searchParams is a Promise in
// Next 16.
export default async function AssessmentRoundPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const session = await getSessionUser()
  if (!session?.archiveId) redirect('/archive-login')

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, status')
    .eq('id', session.archiveId)
    .maybeSingle()

  if (!archive || archive.owner_user_id !== session.userId) redirect('/archive-login')
  if (!isAssessment(archive)) redirect('/archive/dashboard')

  const { area } = await searchParams
  const requested = typeof area === 'string' ? area.trim().slice(0, 40) : ''
  if (!assessmentAreas().includes(requested)) redirect('/archive/assessment')

  return <RoundClient area={requested} />
}
