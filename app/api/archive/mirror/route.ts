import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Latest mirror reflection for the signed-in archive (cookie session).
export async function GET() {
  try {
    const cookieStore = await cookies()
    const archiveId   = cookieStore.get('archive-id')?.value
    if (!archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    console.error('[mirror] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ mirror: null })
  }
}
