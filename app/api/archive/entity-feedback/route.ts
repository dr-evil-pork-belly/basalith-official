import { supabaseAdmin } from '@/lib/supabase-admin'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export async function POST(req: Request) {
  try {
    // Auth: Supabase owner session only. Ownership is verified against the
    // archives table — a session carrying an archiveId is not proof of ownership
    // (getSessionUser fills archiveId for successors too).
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

    const { conversationId, rating, correction } = await req.json()

    if (!conversationId || !rating) {
      return NextResponse.json({ error: 'conversationId and rating required' }, { status: 400 })
    }

    // Update the entity_conversations row, scoped to the caller's own archive.
    // A conversation id alone is not authority to write a correction into the
    // training corpus.
    const { data: convo } = await supabaseAdmin
      .from('entity_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('archive_id', archiveId)
      .maybeSingle()

    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    await supabaseAdmin
      .from('entity_conversations')
      .update({ accuracy_rating: rating, correction: correction ?? null })
      .eq('id', conversationId)
      .eq('archive_id', archiveId)

    // If a correction was provided, save it as an owner deposit so it enriches the entity
    if (correction?.trim()) {
      const { data: dep } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id:     archiveId,
        prompt:         'Accuracy correction',
        response:       correction.trim(),
        source_type:    'entity_chat',
        essence_status: 'pending',
      }).select('id').single()
      if (dep) void classifyDeposit({ depositId: dep.id, archiveId, text: correction.trim() })
    }

    // Update entity_accuracy — increment deposit count, nudge score toward accuracy
    const scoreMap: Record<string, number> = {
      accurate:   1.0,
      partial:    0.5,
      inaccurate: 0.0,
    }
    const newScore = scoreMap[rating] ?? 0.5

    // Upsert a general accuracy row (dimension = 'general')
    const { data: existing } = await supabaseAdmin
      .from('entity_accuracy')
      .select('id, accuracy_score, deposit_count')
      .eq('archive_id', archiveId)
      .eq('dimension', 'general')
      .maybeSingle()

    if (existing) {
      const count = existing.deposit_count + 1
      const rollingScore = (existing.accuracy_score * existing.deposit_count + newScore) / count
      await supabaseAdmin
        .from('entity_accuracy')
        .update({ accuracy_score: rollingScore, deposit_count: count, last_updated: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin.from('entity_accuracy').insert({
        archive_id:    archiveId,
        dimension:     'general',
        accuracy_score: newScore,
        deposit_count:  1,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Entity feedback error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
