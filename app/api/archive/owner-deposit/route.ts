import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { photographId, prompt, response, source_type } = body

    // Auth: cookie (portal) OR x-archive-id header OR body.archiveId (mobile)
    const cookieStore    = await cookies()
    const cookieId       = cookieStore.get('archive-id')?.value
    const headerId       = req.headers.get('x-archive-id')
    const bodyArchiveId  = typeof body.archiveId === 'string' ? body.archiveId : null
    const archiveId      = cookieId || headerId || bodyArchiveId

    console.log('[owner-deposit] auth — cookie:', !!cookieId, '| header:', !!headerId, '| body:', !!bodyArchiveId, '| resolved:', archiveId?.substring(0, 8) ?? 'NONE')

    if (!archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!response?.trim()) {
      return NextResponse.json({ error: 'response required' }, { status: 400 })
    }

    const { data: deposit, error } = await supabaseAdmin
      .from('owner_deposits')
      .insert({
        archive_id:    archiveId,
        photograph_id: photographId ?? null,
        prompt:        prompt ?? null,
        response:      response.trim(),
        source_type:   source_type ?? 'deposit',
      })
      .select()
      .single()

    if (error) throw error

    // Label primary photo if tied to one
    if (photographId) {
      await supabaseAdmin.from('labels').insert({
        photograph_id:       photographId,
        archive_id:          archiveId,
        labelled_by:         'Archive Owner',
        what_was_happening:  response.trim(),
        is_primary_label:    true,
        essence_feed_status: 'pending',
      }).then(({ error: labelErr }) => {
        if (labelErr) console.warn('[owner-deposit] label insert failed:', labelErr.message)
      })
    }

    // Non-fatal archive stat update
    void Promise.resolve(
      supabaseAdmin
        .from('owner_deposits')
        .select('*', { count: 'exact', head: true })
        .eq('archive_id', archiveId)
    ).then(({ count }) => {
      const score = Math.min((count ?? 0) * 2, 25)
      return supabaseAdmin.from('archives').update({ archive_score: score }).eq('id', archiveId)
    }).catch(e => console.warn('[owner-deposit] score update skipped:', e instanceof Error ? e.message : e))

    // Training pair — fire-and-forget
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
          console.warn('[owner-deposit] training pair failed:', e instanceof Error ? e.message : e)
        }
      })()
    }

    return NextResponse.json({ success: true, depositId: deposit.id })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[owner-deposit] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
