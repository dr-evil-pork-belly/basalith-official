import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

// GET /api/game/story?archiveId=xxx&contributorId=xxx
// Returns the active story game for the archive, plus whether this contributor already answered

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId     = searchParams.get('archiveId')
  const contributorId = searchParams.get('contributorId')

  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const { data: session } = await supabaseAdmin
    .from('memory_game_sessions')
    .select('id, scenario_text, scenario_type, dimension, status, reveal_at, created_at')
    .eq('archive_id', archiveId)
    .eq('game_type', 'story')
    .in('status', ['active', 'revealed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) return NextResponse.json({ session: null })

  // Response count (without exposing whose)
  const { count: responseCount } = await supabaseAdmin
    .from('memory_game_responses')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)

  // Has this contributor already answered?
  let alreadyAnswered = false
  if (contributorId) {
    const { data: myResp } = await supabaseAdmin
      .from('memory_game_responses')
      .select('id')
      .eq('session_id', session.id)
      .eq('contributor_id', contributorId)
      .maybeSingle()
    alreadyAnswered = !!myResp
  }

  // If revealed: return all answers (without contributor names)
  let revealedAnswers: string[] | null = null
  if (session.status === 'revealed') {
    const { data: responses } = await supabaseAdmin
      .from('memory_game_responses')
      .select('response_text')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
    revealedAnswers = (responses ?? []).map(r => r.response_text)
  }

  return NextResponse.json({
    session: {
      id:             session.id,
      scenarioText:   session.scenario_text,
      status:         session.status,
      revealAt:       session.reveal_at,
      responseCount:  responseCount ?? 0,
      alreadyAnswered,
      revealedAnswers,
    },
  })
}

// POST /api/game/story — submit a response
// Body: { archiveId, contributorId?, isOwner?, responseText, responseType? }

export async function POST(req: NextRequest) {
  const { archiveId, contributorId, isOwner, responseText, responseType } = await req.json()

  if (!archiveId || !responseText?.trim()) {
    return NextResponse.json({ error: 'archiveId and responseText required' }, { status: 400 })
  }

  // Get active session
  const { data: session } = await supabaseAdmin
    .from('memory_game_sessions')
    .select('id, scenario_text, status')
    .eq('archive_id', archiveId)
    .eq('game_type', 'story')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'No active game' }, { status: 404 })

  // Block duplicate responses
  if (contributorId) {
    const { data: existing } = await supabaseAdmin
      .from('memory_game_responses')
      .select('id')
      .eq('session_id', session.id)
      .eq('contributor_id', contributorId)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already answered' }, { status: 409 })
  }

  const { data: response, error: insertError } = await supabaseAdmin
    .from('memory_game_responses')
    .insert({
      session_id:    session.id,
      archive_id:    archiveId,
      contributor_id: contributorId ?? null,
      is_owner:      !!isOwner,
      response_text: responseText.trim(),
      response_type: responseType ?? 'text',
    })
    .select('id')
    .single()

  if (insertError || !response) {
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Training pair (fire-and-forget)
  if (responseText.trim().length > 30) {
    void (async () => {
      try {
        const { data: arch } = await supabaseAdmin
          .from('archives')
          .select('owner_name, name, preferred_language')
          .eq('id', archiveId)
          .single()
        if (!arch) return
        await createTrainingPairFromDeposit(
          { id: response.id, archive_id: archiveId, prompt: session.scenario_text, response: responseText.trim() },
          arch.owner_name ?? 'Unknown',
          arch.name,
          arch.preferred_language ?? 'en',
          'game_response',
        )
      } catch (e) {
        console.warn('[game/story] training pair failed:', e instanceof Error ? e.message : e)
      }
    })()
  }

  // Get updated count
  const { count } = await supabaseAdmin
    .from('memory_game_responses')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)

  return NextResponse.json({ success: true, responseId: response.id, totalResponses: count ?? 1 })
}
