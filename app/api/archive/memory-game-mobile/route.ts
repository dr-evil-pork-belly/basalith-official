import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { dailySparks } from '@/lib/dailySparks'

export const dynamic = 'force-dynamic'

// Memory game: a weekly question from the spark library (seeded by ISO week number).
// All archives see the same question in a given week — creates shared rhythm.
// Owner submits a response; contributors can see results at week end (future feature).

function getWeekNumber(): number {
  const now     = new Date()
  const start   = new Date(now.getFullYear(), 0, 1)
  const week    = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return week + now.getFullYear() * 100 // unique per year-week
}

function getWeeklyQuestion(): { id: string; text: string } {
  const ownerSparks = dailySparks.filter(s => s.category !== 'contributor')
  const week = getWeekNumber()
  const spark = ownerSparks[week % ownerSparks.length]
  return { id: spark.id, text: spark.text }
}

function getNextMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  return nextMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export async function GET(req: NextRequest) {
  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const question = getWeeklyQuestion()
  const weekKey  = `memory_game_week_${getWeekNumber()}`

  // Check if owner has already answered this week
  const { data: existing } = await supabaseAdmin
    .from('owner_deposits')
    .select('id, response, created_at')
    .eq('archive_id', archiveId)
    .eq('prompt', question.text)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle()

  return NextResponse.json({
    game: {
      weekKey,
      question:    question.text,
      questionId:  question.id,
      answered:    !!existing,
      response:    existing?.response ?? null,
      nextGame:    getNextMonday(),
    },
  })
}

export async function POST(req: NextRequest) {
  const { archiveId, response } = await req.json()
  if (!archiveId || !response?.trim()) {
    return NextResponse.json({ error: 'archiveId and response required' }, { status: 400 })
  }

  const question = getWeeklyQuestion()

  await supabaseAdmin.from('owner_deposits').insert({
    archive_id:  archiveId,
    prompt:      question.text,
    response:    response.trim(),
    source_type: 'memory_game',
  })

  return NextResponse.json({ success: true })
}
