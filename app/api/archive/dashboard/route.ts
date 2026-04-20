import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')

  if (!archiveId || archiveId === 'will-be-set-after-db-setup') {
    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
  }

  const [archive, decades, recentLabels, contributors, photographs, ownerDeposits, entityConvos, significantDates] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('*')
      .eq('id', archiveId)
      .single(),

    supabaseAdmin
      .from('decade_coverage')
      .select('decade, photo_count, labelled_count')
      .eq('archive_id', archiveId)
      .order('decade'),

    supabaseAdmin
      .from('labels')
      .select('id, created_at, what_was_happening, story_extracted, year_taken, location, labelled_by, photograph_id, is_primary_label')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabaseAdmin
      .from('contributors')
      .select('id, name, email, role, status, photos_labelled')
      .eq('archive_id', archiveId)
      .eq('status', 'active'),

    supabaseAdmin
      .from('photographs')
      .select('id, status')
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('owner_deposits')
      .select('id, created_at')
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('entity_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('significant_dates')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),
  ])

  if (archive.error) {
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  }

  return NextResponse.json({
    archive:             archive.data,
    decades:             decades.data       ?? [],
    recentLabels:        recentLabels.data  ?? [],
    contributors:        contributors.data  ?? [],
    photographs:         photographs.data   ?? [],
    ownerDeposits:       ownerDeposits.data ?? [],
    entityConversations: entityConvos.count ?? 0,
    significantDates:    significantDates.count ?? 0,
  })
}
