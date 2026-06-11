import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { B2B_SCENARIOS } from '@/lib/b2bScenarios'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'

export async function POST(req: NextRequest) {
  const session   = await getSessionUser()
  const archiveId = session?.archiveId
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { scenarioId?: string; response?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { scenarioId, response } = body
  if (!scenarioId || !response?.trim()) {
    return NextResponse.json({ error: 'scenarioId and response required' }, { status: 400 })
  }

  const scenario = B2B_SCENARIOS.find(s => s.id === scenarioId)
  if (!scenario) return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 })

  const combinedPrompt = `${scenario.title}: ${scenario.setup} ${scenario.question}`
  const trimmed        = response.trim()

  // Replace any existing response for this scenario (delete + insert avoids needing a unique constraint)
  await supabaseAdmin
    .from('b2b_scenario_responses')
    .delete()
    .eq('archive_id', archiveId)
    .eq('scenario_id', scenarioId)

  const { error: scenarioErr } = await supabaseAdmin
    .from('b2b_scenario_responses')
    .insert({ archive_id: archiveId, scenario_id: scenarioId, response: trimmed, source_type: 'scenario' })

  if (scenarioErr) return NextResponse.json({ error: scenarioErr.message }, { status: 500 })

  // Insert into owner_deposits so the training pipeline picks it up
  const { data: deposit, error: depositErr } = await supabaseAdmin
    .from('owner_deposits')
    .insert({ archive_id: archiveId, prompt: combinedPrompt, response: trimmed, source_type: 'scenario' })
    .select('id')
    .single()

  if (depositErr) {
    console.warn('[scenarios/respond] owner_deposits insert failed:', depositErr.message)
  } else if (deposit) {
    void classifyDeposit({ depositId: deposit.id, archiveId, text: trimmed })
  }

  // Training pair — fire and forget
  if (deposit && trimmed.length > 20) {
    void (async () => {
      try {
        const { data: arch } = await supabaseAdmin
          .from('archives')
          .select('owner_name, name, preferred_language')
          .eq('id', archiveId)
          .single()
        if (!arch) return
        await createTrainingPairFromDeposit(
          { id: deposit.id, archive_id: archiveId, prompt: combinedPrompt, response: trimmed },
          arch.owner_name || 'Unknown',
          arch.name,
          arch.preferred_language || 'en',
        )
      } catch (e) {
        console.warn('[scenarios/respond] training pair failed:', e instanceof Error ? e.message : e)
      }
    })()
  }

  return NextResponse.json({ ok: true })
}
