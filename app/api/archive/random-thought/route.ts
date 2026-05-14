import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { getArchiveSession } from '@/lib/apiSecurity'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getArchiveSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { thought?: string; source?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const thought = body.thought?.trim()
  if (!thought || thought.length < 5) {
    return NextResponse.json({ error: 'Thought too short' }, { status: 400 })
  }

  const archiveId = session.archiveId

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

  // Create training pair non-blocking
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
