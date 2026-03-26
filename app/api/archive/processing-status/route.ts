import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const archiveId = req.nextUrl.searchParams.get('archiveId')

  if (!archiveId) {
    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('photographs')
    .select('status, ai_processed')
    .eq('archive_id', archiveId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const photos      = data ?? []
  const total       = photos.length
  const processed   = photos.filter(p => p.ai_processed).length
  const kept        = photos.filter(p => p.status === 'unlabelled' || p.status === 'labelled').length
  const discarded   = photos.filter(p => p.status === 'discarded').length
  const needsReview = photos.filter(p => p.status === 'needs_review').length
  const pending     = photos.filter(p => p.status === 'pending_ai' || !p.ai_processed).length

  return NextResponse.json({
    total,
    processed,
    kept,
    discarded,
    needsReview,
    pending,
    processingComplete: pending === 0 && total > 0,
  })
}
