import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId    = searchParams.get('archiveId')
  const photographId = searchParams.get('photographId')

  if (!archiveId || !photographId) {
    return NextResponse.json({ error: 'archiveId and photographId required' }, { status: 400 })
  }

  const { data: labels } = await supabaseAdmin
    .from('labels')
    .select('id, what_was_happening, labelled_by, year_taken')
    .eq('archive_id', archiveId)
    .eq('photograph_id', photographId)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ labels: labels ?? [] })
}
