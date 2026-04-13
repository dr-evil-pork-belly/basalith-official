import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const archiveId = searchParams.get('archiveId')

    if (!archiveId) {
      return NextResponse.json({ error: 'Missing archiveId' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('archive_documents')
      .select('id, file_name, file_type, document_type, title, summary, word_count, approximate_decade, created_by, uploaded_by_name, transcript_status, linguistic_patterns, deposit_id, created_at')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ data: data || [] })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
