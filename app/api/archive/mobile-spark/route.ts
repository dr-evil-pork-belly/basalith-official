import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTodaysSpark } from '@/lib/dailySparks'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('owner_name, preferred_language')
    .eq('id', archiveId)
    .single()

  if (!archive) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const spark = getTodaysSpark(false, archive.owner_name ?? '')
  console.log('[mobile-spark] spark:', spark?.text?.substring(0, 50) ?? 'NULL')

  return NextResponse.json({
    spark: spark ? {
      id:        spark.id,
      text:      spark.text,
      dimension: spark.dimension,
      followUp:  spark.followUp ?? null,
    } : null,
    lang: archive.preferred_language ?? 'en',
  })
}
