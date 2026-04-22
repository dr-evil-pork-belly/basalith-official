import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'
import { WITNESS_SESSIONS } from '@/lib/witnessSessions'

// ── PATCH — save answer and advance ────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const { questionIndex, answer } = await req.json()

    if (!sessionId || questionIndex == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Fetch session
    const { data: session, error: fetchErr } = await supabaseAdmin
      .from('witness_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (fetchErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionDef = WITNESS_SESSIONS[session.relationship]
    if (!sessionDef) return NextResponse.json({ error: 'Unknown relationship' }, { status: 400 })

    const subjectName = session.subject_name
    function interpolate(text: string) {
      return text.replace(/\[Name\]/g, subjectName)
    }

    const totalQuestions    = sessionDef.questions.length
    const questionDef       = sessionDef.questions[questionIndex]
    const existingAnswers   = Array.isArray(session.answers) ? session.answers : []
    const trimmedAnswer     = (answer ?? '').trim()
    const hasAnswer         = trimmedAnswer.length > 0

    // Build updated answers array
    const updatedAnswers = [...existingAnswers]
    if (hasAnswer) {
      updatedAnswers.push({
        questionId: questionDef.id,
        question:   interpolate(questionDef.question),
        answer:     trimmedAnswer,
        savedAt:    new Date().toISOString(),
      })
    }

    const nextIndex  = questionIndex + 1
    const isComplete = nextIndex >= totalQuestions

    // Update session
    const updatePayload: any = {
      answers:          updatedAnswers,
      current_question: isComplete ? totalQuestions : nextIndex,
    }
    if (isComplete) {
      updatePayload.status       = 'completed'
      updatePayload.completed_at = new Date().toISOString()
    }

    await supabaseAdmin.from('witness_sessions').update(updatePayload).eq('id', sessionId)

    // Save to witness_deposits (non-fatal, only if there's an answer)
    if (hasAnswer) {
      supabaseAdmin.from('witness_deposits').insert({
        archive_id:         session.archive_id,
        witness_session_id: sessionId,
        contributor_email:  session.contributor_email,
        contributor_name:   session.contributor_name,
        relationship:       session.relationship,
        question_id:        questionDef.id,
        question_text:      interpolate(questionDef.question),
        answer:             trimmedAnswer,
        what_it_captures:   questionDef.what_it_captures,
        essence_status:     'pending',
      }).then(({ error }) => {
        if (error) console.warn('witness_deposit insert skipped:', error.message)
      })

      // Also save to labels table so it appears in gallery + feeds entity prompt
      supabaseAdmin.from('labels').insert({
        archive_id:         session.archive_id,
        labelled_by:        session.contributor_name || session.contributor_email,
        what_was_happening: trimmedAnswer,
        is_primary_label:   false,
        essence_feed_status: 'pending',
      }).then(({ error }) => {
        if (error) console.warn('witness label insert skipped:', error.message)
      })
    }

    // On completion — notify the archive owner
    if (isComplete) {
      notifyOwnerOnCompletion(session, updatedAnswers, sessionDef.title).catch(
        err => console.warn('witness completion notification failed:', err.message)
      )
    }

    return NextResponse.json({
      isComplete,
      nextIndex:    isComplete ? null : nextIndex,
      nextQuestion: isComplete ? null : {
        ...sessionDef.questions[nextIndex],
        question: interpolate(sessionDef.questions[nextIndex]?.question ?? ''),
      },
    })
  } catch (err: any) {
    console.error('witness PATCH:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Owner completion notification ──────────────────────────────────────────
async function notifyOwnerOnCompletion(
  session: any,
  answers: any[],
  relationshipTitle: string,
) {
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('owner_email, name, owner_name')
    .eq('id', session.archive_id)
    .single()

  if (!archive?.owner_email) return

  const contributorName = session.contributor_name || session.contributor_email
  const archiveName     = archive.name || 'Your Archive'
  const ownerFirstName  = archive.owner_name?.split(' ')[0] || 'there'

  // Pull most meaningful answer — longest non-empty one
  const meaningfulAnswer = answers
    .filter(a => a.answer && a.answer.length > 0)
    .sort((a, b) => b.answer.length - a.answer.length)[0]

  const quoteBlock = meaningfulAnswer ? `
  <div style="margin:20px 0;padding:16px 20px;border-left:3px solid rgba(196,162,74,0.6);background:rgba(196,162,74,0.04)">
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#F0EDE6;line-height:1.75;margin:0 0 8px">
      &ldquo;${meaningfulAnswer.answer}&rdquo;
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0">
      &mdash; ${contributorName}, ${relationshipTitle.toLowerCase()}
    </p>
  </div>` : ''

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

  await resend.emails.send({
    from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
    to:      archive.owner_email,
    subject: `${contributorName} just completed their witness session · ${archiveName}`,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
      'X-Entity-Ref-ID':  `basalith-${session.archive_id}-${Date.now()}`,
      'Precedence':       'bulk',
    },
    html: `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 24px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      WITNESS SESSION COMPLETE
    </p>
  </div>

  <div style="padding:0 32px 32px">
    <p style="font-size:20px;font-style:italic;color:#F0EDE6;line-height:1.5;margin:0 0 16px">
      ${contributorName} answered 5 questions about you as ${relationshipTitle.toLowerCase()}.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#9DA3A8;line-height:1.7;margin:0 0 8px">
      Their answers are now in your archive and your entity has been updated.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#9DA3A8;line-height:1.7;margin:0 0 24px">
      Here is one thing they said:
    </p>
    ${quoteBlock}
    <div style="margin-top:28px">
      <a href="${baseUrl}/archive/contributors" style="display:inline-block;background:rgba(196,162,74,1);color:#0A0A0B;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:2px">
        SEE ALL THEIR ANSWERS →
      </a>
    </div>
  </div>

  <div style="padding:24px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
      BASALITH &middot; XYZ<br>
      ${archiveName} &middot; Generation I
    </p>
  </div>

</body>`,
  })

  // Log notification
  supabaseAdmin.from('owner_notifications').insert({
    archive_id: session.archive_id,
    type:       'witness_complete',
    subject:    `Witness session complete — ${contributorName}`,
    sent_to:    archive.owner_email,
    sent_at:    new Date().toISOString(),
    metadata:   { contributorName, relationship: session.relationship },
  }).then(() => {})
}
