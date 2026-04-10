import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')

  if (!archiveId) {
    return Response.json({ error: 'archiveId required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('archive_credentials')
    .select('id, archive_id, is_active, created_at, created_by')
    .eq('archive_id', archiveId)
    .eq('is_active', true)

  return Response.json({
    credentials: data,
    error:       error?.message,
    count:       data?.length || 0,
  })
}
