import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Latest mirror reflection for an archive (mobile). archiveId via query param.
export async function GET(req: NextRequest) {
  try {
    const archiveId = req.nextUrl.searchParams.get('archiveId')
    if (!archiveId) {
      return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
    }

    const { data } = await supabaseAdmin
      .from('mirror_reflections')
      .select('id, reflection, thread_question, owner_reaction, created_at')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ mirror: data ?? null })
  } catch (error: unknown) {
    console.error('[mobile-mirror] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ mirror: null })
  }
}
