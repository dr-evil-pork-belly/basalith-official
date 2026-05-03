import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export async function POST(req: Request) {
  try {
    const { archiveId, photographId, prompt, response } = await req.json()

    if (!archiveId || !response?.trim()) {
      return NextResponse.json({ error: 'archiveId and response required' }, { status: 400 })
    }

    const { data: deposit, error } = await supabaseAdmin
      .from('owner_deposits')
      .insert({
        archive_id:    archiveId,
        photograph_id: photographId ?? null,
        prompt:        prompt ?? null,
        response:      response.trim(),
        essence_status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // If tied to a photograph, also save as a primary label
    if (photographId) {
      await supabaseAdmin.from('labels').insert({
        photograph_id:    photographId,
        archive_id:       archiveId,
        labelled_by:      'Archive Owner',
        what_was_happening: response.trim(),
        is_primary_label: true,
        essence_feed_status: 'pending',
      })
    }

    // Count total owner deposits for score update
    const { count } = await supabaseAdmin
      .from('owner_deposits')
      .select('*', { count: 'exact', head: true })
      .eq('archive_id', archiveId)

    const depositScore = Math.min((count ?? 0) * 2, 25)

    // Partial score update (just the deposit component)
    await supabaseAdmin
      .from('archives')
      .update({ archive_score: depositScore })
      .eq('id', archiveId)

    // Training pair (fire-and-forget)
    if (response.trim().length > 20) {
      void (async () => {
        try {
          const { data: arch } = await supabaseAdmin
            .from('archives').select('owner_name, name, preferred_language').eq('id', archiveId).single()
          if (!arch) return
          await createTrainingPairFromDeposit(
            { id: deposit.id, archive_id: archiveId, prompt: prompt ?? 'Archive deposit', response: response.trim() },
            arch.owner_name || 'Unknown',
            arch.name,
            arch.preferred_language || 'en',
          )
        } catch (e) {
          console.warn('[training] owner-deposit failed:', e instanceof Error ? e.message : e)
        }
      })()
    }

    return NextResponse.json({ success: true, depositId: deposit.id })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Owner deposit error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
