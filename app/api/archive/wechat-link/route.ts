import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateLinkCode } from '@/lib/wechat'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const { data: archive, error } = await supabaseAdmin
    .from('archives')
    .select('wechat_link_code, wechat_open_id')
    .eq('id', archiveId)
    .single()

  if (error || !archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  if (archive.wechat_link_code) {
    return NextResponse.json({
      code:    archive.wechat_link_code,
      linked:  !!archive.wechat_open_id,
    })
  }

  // Generate a unique 6-char code
  let code = generateLinkCode()
  for (let i = 0; i < 5; i++) {
    const { data: collision } = await supabaseAdmin
      .from('archives')
      .select('id')
      .eq('wechat_link_code', code)
      .maybeSingle()
    if (!collision) break
    code = generateLinkCode()
  }

  const { error: updateError } = await supabaseAdmin
    .from('archives')
    .update({ wechat_link_code: code })
    .eq('id', archiveId)

  if (updateError) return NextResponse.json({ error: 'Could not generate code' }, { status: 500 })

  return NextResponse.json({ code, linked: false })
}
