import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getInAppPhotoUrl } from '@/lib/photo-url'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const contributor = await getContributorByToken(token)
  if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: questions } = await supabaseAdmin
    .from('contributor_questions')
    .select('id, question_text, question_type, dimension, photograph_id, status')
    .eq('contributor_id', contributor.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(3)

  // For photograph questions, attach signed URLs
  const enriched = await Promise.all(
    (questions ?? []).map(async q => {
      if (q.photograph_id) {
        const { data: photo } = await supabaseAdmin
          .from('photographs')
          .select('storage_path, ai_era_estimate')
          .eq('id', q.photograph_id)
          .maybeSingle()

        if (photo?.storage_path) {
          return {
            ...q,
            photoUrl:        await getInAppPhotoUrl(photo.storage_path, 86400 * 7),
            ai_era_estimate: photo.ai_era_estimate ?? null,
          }
        }
      }
      return { ...q, photoUrl: null, ai_era_estimate: null }
    }),
  )

  return NextResponse.json({
    questions: enriched,
    contributorName: contributor.name,
    archiveId:       contributor.archive_id,
  })
}
