import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

const JOURNAL_PROMPTS: Record<number, string> = {
  0: 'What are you grateful for this week?',
  1: 'What do you want this week to be about?',
  2: 'What are you working through right now?',
  3: 'Who have you been thinking about this week?',
  4: 'What would you tell your younger self today?',
  5: 'What was the best moment this week?',
  6: 'What did you do today that was just for you?',
}

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const today      = new Date().toISOString().substring(0, 10)
  const dayOfWeek  = new Date().getDay()
  const todayPrompt = JOURNAL_PROMPTS[dayOfWeek]

  // Today's entry
  const { data: todayEntry } = await supabaseAdmin
    .from('journal_entries')
    .select('id, entry_date, content, duration_seconds, mood')
    .eq('archive_id', archiveId)
    .eq('entry_date', today)
    .maybeSingle()

  // Recent entries (last 7 days, excluding today)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  const { data: recentEntries } = await supabaseAdmin
    .from('journal_entries')
    .select('id, entry_date, content, duration_seconds')
    .eq('archive_id', archiveId)
    .neq('entry_date', today)
    .gte('entry_date', sevenDaysAgo)
    .order('entry_date', { ascending: false })
    .limit(7)

  return NextResponse.json({
    todayPrompt,
    todayEntry:    todayEntry ?? null,
    recentEntries: recentEntries ?? [],
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { archiveId, content, voicePath, duration, mood } = body

    if (!archiveId)    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
    if (!content?.trim() && !voicePath) {
      return NextResponse.json({ error: 'content or voicePath required' }, { status: 400 })
    }

    const today      = new Date().toISOString().substring(0, 10)
    const dayOfWeek  = new Date().getDay()
    const todayPrompt = JOURNAL_PROMPTS[dayOfWeek]

    const { data: entry, error: entryErr } = await supabaseAdmin
      .from('journal_entries')
      .upsert(
        {
          archive_id:       archiveId,
          entry_date:       today,
          content:          content?.trim() ?? null,
          voice_path:       voicePath ?? null,
          duration_seconds: duration  ?? null,
          mood:             mood      ?? null,
        },
        { onConflict: 'archive_id,entry_date' }
      )
      .select('id')
      .single()

    if (entryErr) {
      console.error('[journal] entry upsert failed:', entryErr.message)
      return NextResponse.json({ error: entryErr.message }, { status: 500 })
    }

    if (content?.trim()) {
      const { data: deposit } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id:  archiveId,
        prompt:      todayPrompt,
        response:    content.trim(),
        source_type: 'journal',
      }).select('id, archive_id, prompt, response, source_type').single()

      if (deposit) {
        const { data: arch } = await supabaseAdmin
          .from('archives')
          .select('owner_name, name, preferred_language')
          .eq('id', archiveId)
          .single()
        if (arch) {
          createTrainingPairFromDeposit(
            deposit,
            arch.owner_name ?? '',
            arch.name,
            arch.preferred_language ?? 'en',
          ).catch(() => {})
        }
      }
    }

    return NextResponse.json({ ok: true, entryId: entry?.id })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[journal] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
