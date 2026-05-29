import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSuccessorSession } from '@/lib/successorAuth'

export async function POST(req: NextRequest) {
  const session = getSuccessorSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let content: string, contextType: string
  try {
    const body = await req.json()
    content     = (body.content     ?? '').trim()
    contextType = (body.contextType ?? 'business_update').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!content || content.length < 10) {
    return NextResponse.json({ error: 'Content too short' }, { status: 400 })
  }

  const validTypes = ['business_update', 'market_condition', 'organizational_change', 'strategic_decision', 'other']
  if (!validTypes.includes(contextType)) {
    return NextResponse.json({ error: 'Invalid context type' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('successor_contexts')
    .insert({
      archive_id:   session.archiveId,
      successor_id: session.successorId,
      content,
      context_type: contextType,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[succession/context/add]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}
