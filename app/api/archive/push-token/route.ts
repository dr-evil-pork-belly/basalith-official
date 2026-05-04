import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { archiveId, token } = await req.json()

  if (!archiveId || !token) {
    return NextResponse.json({ error: 'archiveId and token required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('archives')
    .update({ expo_push_token: token })
    .eq('id', archiveId)

  if (error) {
    console.error('[push-token] update failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
