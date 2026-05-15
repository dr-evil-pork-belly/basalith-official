import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

async function getArchiveId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('archive-id')?.value ?? null
}

// GET — owner views all exchanges
export async function GET() {
  const archiveId = await getArchiveId()
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: exchanges } = await supabaseAdmin
    .from('wisdom_exchanges')
    .select('id, question, question_context, entity_response, owner_correction, owner_reviewed, status, created_at, contributor_id, contributors(name, role)')
    .eq('archive_id', archiveId)
    .in('status', ['answered', 'reviewed', 'approved'])
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ exchanges: exchanges ?? [] })
}

// POST — owner approves, corrects, or ignores
export async function POST(req: NextRequest) {
  const archiveId = await getArchiveId()
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exchangeId, action, correction } = await req.json()
  if (!exchangeId || !action) return NextResponse.json({ error: 'exchangeId and action required' }, { status: 400 })

  // Verify ownership
  const { data: exchange } = await supabaseAdmin
    .from('wisdom_exchanges')
    .select('id, archive_id, question, entity_response, contributor_id')
    .eq('id', exchangeId)
    .eq('archive_id', archiveId)
    .maybeSingle()

  if (!exchange) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'ignore') {
    await supabaseAdmin.from('wisdom_exchanges').update({ status: 'ignored' }).eq('id', exchangeId)
    return NextResponse.json({ success: true })
  }

  if (action === 'approve') {
    await supabaseAdmin.from('wisdom_exchanges').update({ owner_reviewed: true, status: 'approved', owner_reviewed_at: new Date().toISOString() }).eq('id', exchangeId)

    // Create training pair from approved Q&A
    if (exchange.entity_response) {
      const { data: arch } = await supabaseAdmin.from('archives').select('owner_name, name, preferred_language').eq('id', archiveId).single()
      if (arch) {
        const { data: dep } = await supabaseAdmin.from('owner_deposits').insert({
          archive_id: archiveId, prompt: exchange.question, response: exchange.entity_response, source_type: 'entity_chat',
        }).select('id, archive_id, prompt, response, source_type').single()
        if (dep) createTrainingPairFromDeposit(dep, arch.owner_name ?? '', arch.name, arch.preferred_language ?? 'en', 'entity_chat').catch(() => {})
      }
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'correct' && correction?.trim()) {
    await supabaseAdmin.from('wisdom_exchanges').update({
      owner_reviewed:    true,
      owner_correction:  correction.trim(),
      owner_reviewed_at: new Date().toISOString(),
      status:            'reviewed',
    }).eq('id', exchangeId)

    // Training pair from correction — more valuable than approval
    const { data: arch } = await supabaseAdmin.from('archives').select('owner_name, name, preferred_language').eq('id', archiveId).single()
    if (arch) {
      const { data: dep } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id: archiveId, prompt: exchange.question, response: correction.trim(), source_type: 'entity_chat',
      }).select('id, archive_id, prompt, response, source_type').single()
      if (dep) createTrainingPairFromDeposit(dep, arch.owner_name ?? '', arch.name, arch.preferred_language ?? 'en', 'entity_chat').catch(() => {})
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
