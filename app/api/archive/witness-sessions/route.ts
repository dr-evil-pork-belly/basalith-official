import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('witness_sessions')
    .select('*')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('witness_sessions fetch skipped:', error.message)
    return NextResponse.json({ sessions: [] })
  }

  return NextResponse.json({ sessions: data ?? [] })
}
