import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { selectResurfacing, frameTextFromKey } from '@/lib/selectResurfacing'

export const dynamic = 'force-dynamic'

// "You told me this" — today's resurfaced deposit for the signed-in archive.
// Idempotent per (archive_id, UTC day): the first load picks and records one
// deposit; concurrent and subsequent loads converge on that same row.
export async function GET() {
  try {
    const session   = await getSessionUser()
    const archiveId = session?.archiveId
    if (!archiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().slice(0, 10) // UTC day

    // Build the card payload from a recorded resurfacing row. The frame text is
    // recomputed deterministically from frame_key; nothing is generated.
    async function payloadFor(depositId: string, frameKey: string, reaction: string | null) {
      const [{ data: dep }, { data: arch }] = await Promise.all([
        supabaseAdmin
          .from('owner_deposits')
          .select('id, created_at, source_type, prompt, response')
          .eq('id', depositId)
          .eq('archive_id', archiveId)
          .maybeSingle(),
        supabaseAdmin
          .from('archives')
          .select('preferred_language')
          .eq('id', archiveId)
          .maybeSingle(),
      ])
      if (!dep) return { resurfacing: null }
      return {
        resurfacing: {
          deposit_id:  dep.id,
          created_at:  dep.created_at,
          source_type: dep.source_type,
          prompt:      dep.prompt ?? null,
          response:    dep.response,
          frame_key:   frameKey,
          frame_text:  frameTextFromKey(frameKey, arch?.preferred_language ?? 'en'),
          reaction:    reaction ?? null,
        },
      }
    }

    // 1. Already chosen today? Return it.
    const { data: existing } = await supabaseAdmin
      .from('deposit_resurfacings')
      .select('deposit_id, frame_key, reaction')
      .eq('archive_id', archiveId)
      .eq('shown_on', today)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(await payloadFor(existing.deposit_id, existing.frame_key, existing.reaction))
    }

    // 2. Pick today's candidate (pure retrieval, no generation).
    const sel = await selectResurfacing(archiveId)
    if (!sel) return NextResponse.json({ resurfacing: null })

    // 3. Record it. ON CONFLICT (archive_id, shown_on) DO NOTHING — concurrent
    //    loads converge on one deposit and one row.
    await supabaseAdmin
      .from('deposit_resurfacings')
      .upsert(
        { archive_id: archiveId, deposit_id: sel.deposit_id, shown_on: today, frame_key: sel.frame_key },
        { onConflict: 'archive_id,shown_on', ignoreDuplicates: true },
      )

    // 4. Read the single winning row back and return it.
    const { data: row } = await supabaseAdmin
      .from('deposit_resurfacings')
      .select('deposit_id, frame_key, reaction')
      .eq('archive_id', archiveId)
      .eq('shown_on', today)
      .maybeSingle()
    if (!row) return NextResponse.json({ resurfacing: null })

    return NextResponse.json(await payloadFor(row.deposit_id, row.frame_key, row.reaction))
  } catch (error: unknown) {
    console.error('[resurfacing/today] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ resurfacing: null })
  }
}
