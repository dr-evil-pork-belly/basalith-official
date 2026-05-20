import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { thought?: string; source?: string; archiveId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  // Auth: cookie (portal) OR x-archive-id header OR body.archiveId (mobile)
  const cookieStore   = await cookies()
  const cookieId      = cookieStore.get('archive-id')?.value
  const headerId      = req.headers.get('x-archive-id')
  const bodyId        = typeof body.archiveId === 'string' ? body.archiveId : null
  const archiveId     = cookieId || headerId || bodyId

  console.log('[random-thought] cookie:', !!cookieId, '| header:', !!headerId, '| body:', !!bodyId, '| resolved:', archiveId?.substring(0, 8) ?? 'NONE')

  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
