import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export async function GET() {
  try {
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too).
    const session = await getSessionUser()
    if (!session?.archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const archiveId = session.archiveId

    const { data: ownerRow } = await supabaseAdmin
      .from('archives')
      .select('owner_user_id')
      .eq('id', archiveId)
      .maybeSingle()
    if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
