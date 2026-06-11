import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTodaysSpark } from '@/lib/dailySparks'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'

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

// ── GET — today's session data ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const today = new Date().toISOString().substring(0, 10)

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, current_streak, longest_streak, last_session_date')
    .eq('id', archiveId)
    .single()

  if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  // Ensure session row exists (silent if duplicate)
  await supabaseAdmin
    .from('daily_sessions')
    .insert({ archive_id: archiveId, session_date: today })
    .then(() => {})

  const { data: session } = await supabaseAdmin
    .from('daily_sessions')
    .select('*')
    .eq('archive_id', archiveId)
    .eq('session_date', today)
    .single()

  if (session?.completed) {
    return NextResponse.json({
      sessionDate:      today,
      alreadyCompleted: true,
      sessionId:        session.id,
      streak:           archive.current_streak ?? 0,
      longestStreak:    archive.longest_streak ?? 0,
      steps:            [],
    })
  }

  // ── Build today's steps ──────────────────────────────────────────────────────

  const steps: object[] = []

  // Step 1: spark question (skip if already answered today)
  const spark = getTodaysSpark(false, archive.owner_name ?? '')
  if (spark) {
    const { count: sparkCount } = await supabaseAdmin
      .from('owner_deposits')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId)
      .eq('source_type', 'spark')
      .gte('created_at', `${today}T00:00:00Z`)

    if ((sparkCount ?? 0) === 0) {
      steps.push({ type: 'question', content: spark.text, sparkId: spark.id })
    }
  }

  // Step 2: unlabelled photograph the owner hasn't already labeled
  const { data: labelledRows } = await supabaseAdmin
    .from('labels')
    .select('photograph_id')
    .eq('archive_id', archiveId)
    .eq('is_primary_label', true)

  const labelledIds = (labelledRows ?? []).map(r => r.photograph_id).filter(Boolean) as string[]

  let photoQuery = supabaseAdmin
    .from('photographs')
    .select('id, ai_era_estimate, storage_path')
    .eq('archive_id', archiveId)
    .eq('status', 'unlabelled')
    .order('created_at', { ascending: true })
    .limit(1)

  if (labelledIds.length > 0) {
    photoQuery = photoQuery.not('id', 'in', `(${labelledIds.join(',')})`) as typeof photoQuery
  }

  const { data: photoData } = await photoQuery
  const photo = photoData?.[0] ?? null

  if (photo) {
    let photoUrl: string | null = null
    if (photo.storage_path) {
      const { data: signed } = await supabaseAdmin
        .storage.from('photographs')
        .createSignedUrl(photo.storage_path, 3600)
      photoUrl = signed?.signedUrl ?? null
    }
    steps.push({
      type:        'photograph',
      photoId:     photo.id,
      photoUrl,
      eraEstimate: photo.ai_era_estimate ?? null,
      question:    'What do you remember about this moment?',
    })
  }

  // Step 3: free capture
  steps.push({
    type:   'free_capture',
    prompt: 'What is on your mind today? Anything at all.',
  })

  // Step 4: contributor ping — most recent answered question in last 7 days
  const { data: recentAnswer } = await supabaseAdmin
    .from('contributor_questions')
    .select('id, question_text, answer_text, contributors(name)')
    .eq('archive_id', archiveId)
    .eq('status', 'answered')
    .not('answer_text', 'is', null)
    .gte('answered_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('answered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentAnswer?.answer_text) {
    const contrib = recentAnswer.contributors as unknown as { name: string } | null
    steps.push({
      type:            'contributor_ping',
      questionId:      recentAnswer.id,
      contributorName: contrib?.name ?? 'A family member',
      question:        recentAnswer.question_text,
      content:         recentAnswer.answer_text,
    })
  }

  // Step 5: journal
  const dayOfWeek = new Date().getDay()
  steps.push({
    type:   'journal',
    prompt: JOURNAL_PROMPTS[dayOfWeek],
  })

  return NextResponse.json({
    sessionDate:      today,
    alreadyCompleted: false,
    sessionId:        session?.id ?? null,
    streak:           archive.current_streak ?? 0,
    longestStreak:    archive.longest_streak ?? 0,
    steps,
  })
}

// ── POST — save a step OR complete the session ────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, sessionId } = body

    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    const { data: session } = await supabaseAdmin
      .from('daily_sessions')
      .select('id, archive_id, steps_completed, deposits_added')
      .eq('id', sessionId)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const archiveId = session.archive_id

    // ── Complete session ───────────────────────────────────────────────────────
    if (action === 'complete') {
      const today = new Date().toISOString().substring(0, 10)

      const { data: archive } = await supabaseAdmin
        .from('archives')
        .select('current_streak, longest_streak, last_session_date')
        .eq('id', archiveId)
        .single()

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().substring(0, 10)

      const prevStreak    = archive?.current_streak ?? 0
      const prevLongest   = archive?.longest_streak ?? 0
      const lastDate      = archive?.last_session_date as string | null
      const newStreak     = lastDate === yesterdayStr ? prevStreak + 1 : 1
      const newLongest    = Math.max(newStreak, prevLongest)

      await Promise.all([
        supabaseAdmin
          .from('daily_sessions')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', sessionId),
        supabaseAdmin
          .from('archives')
          .update({ current_streak: newStreak, longest_streak: newLongest, last_session_date: today })
          .eq('id', archiveId),
      ])

      console.log('[daily-session] complete — streak:', newStreak, 'archive:', archiveId.substring(0, 8))
      return NextResponse.json({ ok: true, streak: newStreak })
    }

    // ── Save step ──────────────────────────────────────────────────────────────
    const { stepType, response, sparkId, sparkText, photoId, journalPrompt } = body
    if (!stepType || !response?.trim()) {
      return NextResponse.json({ error: 'stepType and response required' }, { status: 400 })
    }

    const text  = String(response).trim()
    const today = new Date().toISOString().substring(0, 10)
    let depositsAdded = 0

    if (stepType === 'question') {
      const { data: dep } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id:  archiveId,
        prompt:      sparkText ?? 'Daily question',
        response:    text,
        source_type: 'spark',
      }).select('id').single()
      if (dep) void classifyDeposit({ depositId: dep.id, archiveId, text })
      await supabaseAdmin.from('daily_spark_responses').insert({
        archive_id:    archiveId,
        contributor_id: null,
        spark_id:      sparkId ?? 'session_question',
        spark_text:    sparkText ?? '',
        response_text: text,
        response_type: 'text',
        is_owner:      true,
      }).then(({ error }) => { if (error) console.warn('[daily-session] spark_response:', error.message) })
      depositsAdded = 1

    } else if (stepType === 'photograph') {
      if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 })
      await supabaseAdmin.from('labels').insert({
        archive_id:          archiveId,
        photograph_id:       photoId,
        what_was_happening:  text,
        labelled_by:         'Archive Owner',
        is_primary_label:    true,
        essence_feed_status: 'pending',
      }).then(({ error }) => { if (error) console.warn('[daily-session] label:', error.message) })
      const { data: photoDep } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id:    archiveId,
        photograph_id: photoId,
        prompt:        'What do you remember about this moment?',
        response:      text,
        source_type:   'photograph_label',
      }).select('id').single()
      if (photoDep) void classifyDeposit({ depositId: photoDep.id, archiveId, text })
      depositsAdded = 1

    } else if (stepType === 'free_capture') {
      const { data: freeDep } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id:  archiveId,
        prompt:      'What is on your mind today?',
        response:    text,
        source_type: 'free_capture',
      }).select('id').single()
      if (freeDep) void classifyDeposit({ depositId: freeDep.id, archiveId, text })
      depositsAdded = 1

    } else if (stepType === 'contributor_ping') {
      const { data: pingDep } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id:  archiveId,
        prompt:      'Reaction to family contribution',
        response:    text,
        source_type: 'contributor_ping',
      }).select('id').single()
      if (pingDep) void classifyDeposit({ depositId: pingDep.id, archiveId, text })
      depositsAdded = 1

    } else if (stepType === 'journal') {
      const prompt = journalPrompt ?? 'Today\'s journal entry'
      await supabaseAdmin.from('journal_entries').upsert(
        { archive_id: archiveId, entry_date: today, content: text },
        { onConflict: 'archive_id,entry_date' }
      ).then(({ error }) => { if (error) console.warn('[daily-session] journal:', error.message) })
      const { data: dep } = await supabaseAdmin.from('owner_deposits').insert({
        archive_id:  archiveId,
        prompt,
        response:    text,
        source_type: 'journal',
      }).select('id, archive_id, prompt, response, source_type').single()
      if (dep) {
        void classifyDeposit({ depositId: dep.id, archiveId, text })
        const { data: arch } = await supabaseAdmin
          .from('archives').select('owner_name, name, preferred_language').eq('id', archiveId).single()
        if (arch) {
          createTrainingPairFromDeposit(
            dep, arch.owner_name ?? '', arch.name, arch.preferred_language ?? 'en',
          ).catch(() => {})
        }
      }
      depositsAdded = 1
    }

    await supabaseAdmin
      .from('daily_sessions')
      .update({
        steps_completed: session.steps_completed + 1,
        deposits_added:  session.deposits_added + depositsAdded,
      })
      .eq('id', sessionId)

    console.log('[daily-session] step saved — type:', stepType, 'archive:', archiveId.substring(0, 8))
    return NextResponse.json({ ok: true })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[daily-session] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
