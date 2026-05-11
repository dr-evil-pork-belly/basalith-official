import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function GET(req: NextRequest) {
  if (!validateGodAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const [{ data: contributors }, { count: totalPhotos }] = await Promise.all([
    supabaseAdmin
      .from('contributors')
      .select('id, name, email, status')
      .eq('archive_id', archiveId)
      .eq('status', 'active'),

    supabaseAdmin
      .from('photographs')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .eq('is_best_in_cluster', true),
  ])

  if (!contributors?.length) return NextResponse.json({ contributors: [] })

  const stats = await Promise.all(
    contributors.map(async c => {
      const [{ count: sent }, { count: responded }] = await Promise.all([
        supabaseAdmin
          .from('contributor_photo_sends')
          .select('id', { count: 'exact', head: true })
          .eq('contributor_id', c.id),
        supabaseAdmin
          .from('contributor_photo_sends')
          .select('id', { count: 'exact', head: true })
          .eq('contributor_id', c.id)
          .eq('responded', true),
      ])

      const sentCount      = sent      ?? 0
      const respondedCount = responded ?? 0
      const remaining      = Math.max(0, (totalPhotos ?? 0) - sentCount)

      return {
        contributorId: c.id,
        name:          c.name ?? c.email,
        sent:          sentCount,
        responded:     respondedCount,
        remaining,
        exhausted:     remaining === 0,
      }
    })
  )

  return NextResponse.json({ contributors: stats, totalPhotos: totalPhotos ?? 0 })
}
