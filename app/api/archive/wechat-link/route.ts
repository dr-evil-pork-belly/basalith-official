import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateLinkCode } from '@/lib/wechat'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too). This route mints and
  // persists wechat_link_code, which the WeChat webhook accepts as a bearer
  // credential, so it is a credential-issuing endpoint rather than a read.
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
