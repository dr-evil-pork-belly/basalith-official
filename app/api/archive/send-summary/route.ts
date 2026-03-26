import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

function buildSummaryEmail(
  archiveName: string,
  replies: Array<{ contributor_name: string | null; contributor_email: string; raw_reply: string }>,
): string {
  const repliesHtml = replies.map(r => {
    const name = r.contributor_name || r.contributor_email.split('@')[0]
    return `
    <div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid rgba(240,237,230,0.06)">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;text-transform:uppercase;margin:0 0 8px">
        ${name}
      </p>
      <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#B8B4AB;line-height:1.8;margin:0">
        "${r.raw_reply.substring(0, 400)}${r.raw_reply.length > 400 ? '…' : ''}"
      </p>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase">${archiveName}</p>
  <p style="font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6;margin-bottom:8px">
    Here is what the family remembered.
  </p>
  <p style="font-size:14px;font-weight:300;color:#706C65;line-height:1.6;margin-bottom:32px">
    ${replies.length} ${replies.length === 1 ? 'memory' : 'memories'} were added to ${archiveName} for this photograph.
  </p>
  ${repliesHtml}
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8">
    BASALITH · XYZ<br>${archiveName} · Generation I
  </p>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    // Get session + replies
    const { data: session } = await supabaseAdmin
      .from('email_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.summary_sent) return NextResponse.json({ skipped: true, reason: 'Already sent' })
    if ((session.reply_count ?? 0) < 2) {
      return NextResponse.json({ skipped: true, reason: 'Not enough replies' })
    }

    const { data: replies } = await supabaseAdmin
      .from('email_replies')
      .select('contributor_name, contributor_email, raw_reply')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (!replies?.length) return NextResponse.json({ skipped: true, reason: 'No replies found' })

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('name')
      .eq('id', session.archive_id)
      .single()

    const archiveName = archive?.name ?? 'The Archive'
    const html        = buildSummaryEmail(archiveName, replies)

    // Send to all original recipients
    for (const recipient of (session.recipients ?? [])) {
      await resend.emails.send({
        from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      recipient,
        subject: `What the family remembered · ${archiveName}`,
        html,
      })
    }

    await supabaseAdmin
      .from('email_sessions')
      .update({ summary_sent: true })
      .eq('id', sessionId)

    return NextResponse.json({ success: true, recipientCount: session.recipients?.length ?? 0 })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('send-summary error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
