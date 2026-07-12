import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { thought?: string; source?: string; archiveId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too).
  const session = await getSessionUser()
  if (!session?.archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const thought = body.thought?.trim()
  if (!thought || thought.length < 3) {
    return NextResponse.json({ error: 'Thought too short' }, { status: 400 })
  }

  const [{ data: archive }, { data: deposit, error }] = await Promise.all([
    supabaseAdmin.from('archives').select('name, owner_name, preferred_language').eq('id', archiveId).single(),
    supabaseAdmin
      .from('owner_deposits')
      .insert({
        archive_id:  archiveId,
        prompt:      'Random thought',
        response:    thought,
        source_type: body.source ?? 'random_thought',
      })
      .select('id, archive_id, prompt, response, source_type')
      .single(),
  ])

  if (error || !deposit) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  void classifyDeposit({ depositId: deposit.id, archiveId, text: thought })

  if (archive) {
    createTrainingPairFromDeposit(
      deposit,
      archive.owner_name ?? '',
      archive.name ?? '',
      archive.preferred_language ?? 'en',
      'random_thought',
    ).catch(e => console.error('[random-thought] training pair failed:', e instanceof Error ? e.message : e))
  }

  return NextResponse.json({ success: true, depositId: deposit.id })
}
