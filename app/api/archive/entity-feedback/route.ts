import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { archiveId, conversationId, rating, correction } = await req.json()

    if (!archiveId || !conversationId || !rating) {
      return NextResponse.json({ error: 'archiveId, conversationId, and rating required' }, { status: 400 })
    }

    // Update the entity_conversations row with rating and correction
    await supabaseAdmin
      .from('entity_conversations')
      .update({ accuracy_rating: rating, correction: correction ?? null })
      .eq('id', conversationId)

    // If a correction was provided, save it as an owner deposit so it enriches the entity
    if (correction?.trim()) {
      await supabaseAdmin.from('owner_deposits').insert({
        archive_id:     archiveId,
        prompt:         'Accuracy correction',
        response:       correction.trim(),
        essence_status: 'pending',
      })
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
