import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { WITNESS_SESSIONS } from '@/lib/witnessSessions'

// ── POST — create a new witness session ────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { archiveId, contributorEmail, contributorName, relationship, subjectName } = await req.json()

    if (!archiveId || !contributorEmail || !relationship || !subjectName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sessionDef = WITNESS_SESSIONS[relationship]
    if (!sessionDef) {
      return NextResponse.json({ error: 'Unknown relationship type' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('witness_sessions')
      .insert({
        archive_id:        archiveId,
        contributor_email: contributorEmail,
        contributor_name:  contributorName || null,
        relationship,
        subject_name:      subjectName,
        status:            'in_progress',
        current_question:  0,
        answers:           [],
      })
      .select()
      .single()

    if (error) throw error

    const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const sessionUrl = `${baseUrl}/witness/${data.id}`

    return NextResponse.json({ sessionId: data.id, sessionUrl })
  } catch (err: any) {
    console.error('witness POST:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── GET — fetch session with archive info ───────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: session, error } = await supabaseAdmin
    .from('witness_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('name, owner_name, family_name')
    .eq('id', session.archive_id)
    .single()

  const sessionDef = WITNESS_SESSIONS[session.relationship]
  if (!sessionDef) return NextResponse.json({ error: 'Unknown relationship' }, { status: 400 })

  // Interpolate [Name] in intro and questions
  const subjectName = session.subject_name
  function interpolate(text: string) {
    return text.replace(/\[Name\]/g, subjectName)
  }

  return NextResponse.json({
    sessionId:        session.id,
    archiveId:        session.archive_id,
    archiveName:      archive?.name ?? 'The Family Archive',
    ownerName:        archive?.owner_name ?? subjectName,
    contributorName:  session.contributor_name,
    contributorEmail: session.contributor_email,
    relationship:     session.relationship,
    subjectName,
    status:           session.status,
    currentQuestion:  session.current_question,
    answers:          session.answers ?? [],
    title:            sessionDef.title,
    intro:            interpolate(sessionDef.intro),
    estimatedMinutes: sessionDef.estimatedMinutes,
    totalQuestions:   sessionDef.questions.length,
    questions:        sessionDef.questions.map(q => ({
      ...q,
      question: interpolate(q.question),
    })),
  })
}
