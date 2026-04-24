import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken, generateQuestionsForContributor } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, questionId, answerText } = await req.json()
    if (!token || !questionId || !answerText?.trim()) {
      return NextResponse.json({ error: 'token, questionId, and answerText required' }, { status: 400 })
    }

    const contributor = await getContributorByToken(token)
    if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const archiveId = contributor.archive_id as string
    const archive   = contributor.archives as { name: string; family_name: string; owner_email: string | null; owner_name: string | null } | null

    // Fetch the question
    const { data: question } = await supabaseAdmin
      .from('contributor_questions')
      .select('*')
      .eq('id', questionId)
      .eq('contributor_id', contributor.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const now = new Date().toISOString()

    // If it's a photograph question, save to labels table too
    if (question.question_type === 'photograph_label' && question.photograph_id) {
      await supabaseAdmin.from('labels').insert({
        archive_id:         archiveId,
        photograph_id:      question.photograph_id,
        what_was_happening: answerText.trim(),
        labelled_by:        contributor.name ?? contributor.email,
        created_at:         now,
      })
    }

    // Save as owner_deposit so entity learns from it
    await supabaseAdmin.from('owner_deposits').insert({
      archive_id: archiveId,
      prompt:     question.question_text,
      response:   answerText.trim(),
      created_at: now,
    })

    // Mark question answered
    await supabaseAdmin
      .from('contributor_questions')
      .update({ status: 'answered', answer_text: answerText.trim(), answered_at: now })
      .eq('id', questionId)

    // Increment contributor's questions_answered count
    try {
      const { error: rpcErr } = await supabaseAdmin.rpc('increment_contributor_questions_answered', {
        p_contributor_id: contributor.id,
      })
      if (rpcErr) throw rpcErr
    } catch {
      await supabaseAdmin
        .from('contributors')
        .update({ questions_answered: (contributor.questions_answered ?? 0) + 1 })
        .eq('id', contributor.id)
    }

    // Generate a replacement question
    await generateQuestionsForContributor(
      contributor.id,
      archiveId,
      contributor.relationship ?? 'other',
    ).catch(() => {})

    // Get the next pending question to return
    const { data: nextQuestions } = await supabaseAdmin
      .from('contributor_questions')
      .select('id, question_text, question_type, dimension, photograph_id')
      .eq('contributor_id', contributor.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    let nextQuestion = nextQuestions?.[0] ?? null
    if (nextQuestion?.photograph_id) {
      const { data: photo } = await supabaseAdmin
        .from('photographs')
        .select('storage_path, ai_era_estimate')
        .eq('id', nextQuestion.photograph_id)
        .maybeSingle()
      if (photo?.storage_path) {
        const { data: signed } = await supabaseAdmin
          .storage.from('photographs')
          .createSignedUrl(photo.storage_path, 86400)
        nextQuestion = {
          ...nextQuestion,
          photoUrl:        signed?.signedUrl ?? null,
          ai_era_estimate: photo.ai_era_estimate ?? null,
        } as typeof nextQuestion
      }
    }

    // Notify archive owner (best-effort)
    if (archive?.owner_email) {
      const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
      const contributorName = contributor.name ?? contributor.email

      resend.emails.send({
        from:    `${archive.name} <${fromEmail}>`,
        to:      archive.owner_email,
        subject: `${contributorName} answered a question about you`,
        html: `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:520px;margin:0 auto;padding:0">
  <div style="padding:40px 40px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0">
      ${archive.name.toUpperCase()}
    </p>
  </div>
  <div style="padding:32px 40px 40px">
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 20px">
      ${contributorName} answered a question about you.
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0 0 8px">
      THE QUESTION
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#9DA3A8;line-height:1.7;margin:0 0 20px">
      ${question.question_text}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0 0 8px">
      THEIR ANSWER
    </p>
    <div style="border-left:2px solid rgba(196,162,74,0.4);padding:0 0 0 20px">
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.8;font-style:italic;margin:0">
        ${answerText.trim()}
      </p>
    </div>
    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;margin-top:28px">
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#3A3830;margin:0 0 12px">
        This answer is now in your archive permanently.
      </p>
      <a href="${siteUrl}/archive/entity" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;text-decoration:none">
        VIEW YOUR ENTITY →
      </a>
    </div>
  </div>
</body>
</html>`,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-${archiveId}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, nextQuestion })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[contribute/answer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
