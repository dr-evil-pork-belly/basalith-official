import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTodaysSpark } from '@/lib/dailySparks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

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
