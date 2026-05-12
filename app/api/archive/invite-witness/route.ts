import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'
import { WITNESS_SESSIONS } from '@/lib/witnessSessions'

export async function POST(req: Request) {
  try {
    const {
      archiveId,
      contributorEmail,
      contributorName,
      relationship,
      subjectName,
      ownerName,
      personalNote,
    } = await req.json()

    if (!archiveId || !contributorEmail || !relationship || !subjectName || !ownerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sessionDef = WITNESS_SESSIONS[relationship]
    if (!sessionDef) {
      return NextResponse.json({ error: 'Unknown relationship type' }, { status: 400 })
    }

    // Create the witness session
    const { data: session, error: sessionErr } = await supabaseAdmin
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

    if (sessionErr) throw sessionErr

    const baseUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const sessionUrl = `${baseUrl}/witness/${session.id}`

    // Fetch archive name
    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('name')
      .eq('id', archiveId)
      .single()
    const archiveName = archive?.name ?? 'The Family Archive'

    const recipientName  = contributorName || 'there'
    const personalNoteHtml = personalNote?.trim() ? `
  <div style="margin:24px 0;padding:16px 20px;border-left:3px solid rgba(196,162,74,0.6);background:rgba(196,162,74,0.04)">
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#F0EDE6;line-height:1.75;margin:0 0 8px">
      &ldquo;${personalNote.trim()}&rdquo;
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0">
      &mdash; ${ownerName}
    </p>
  </div>` : ''

    await resend.emails.send({
      from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      contributorEmail,
      subject: `${ownerName} has invited you to contribute to ${archiveName}`,
      html: `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:40px 32px 0;text-align:center">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style="margin:0 auto 16px;display:block">
      <rect x="5" y="5" width="26" height="26" stroke="rgba(196,162,74,0.9)" stroke-width="1.2" transform="rotate(45 18 18)"/>
      <rect x="9" y="9" width="18" height="18" stroke="rgba(196,162,74,0.45)" stroke-width="0.8" transform="rotate(45 18 18)"/>
    </svg>
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0">
      ${archiveName.toUpperCase()}
    </p>
  </div>

  <div style="padding:32px">
    <p style="font-size:20px;font-style:italic;color:#F0EDE6;line-height:1.6;margin:0 0 20px">
      ${ownerName} is building a permanent archive of their life.
    </p>
    <p style="font-size:16px;color:#9DA3A8;line-height:1.75;margin:0 0 8px">
      They have invited you to contribute because your memories and observations are a part of this story that only you can tell.
    </p>
    ${personalNoteHtml}
    <p style="font-size:16px;color:#9DA3A8;line-height:1.75;margin:20px 0 8px">
      Your contribution is a guided session of 5 questions. Your answers go directly into the archive and help train the AI entity that will carry ${subjectName}&rsquo;s wisdom forward for generations.
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0 0 28px">
      It takes about ${sessionDef.estimatedMinutes} minutes.
    </p>

    <div style="text-align:center">
      <a href="${sessionUrl}" style="display:inline-block;background:rgba(196,162,74,1);color:#0A0A0B;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:2px">
        BEGIN YOUR SESSION →
      </a>
    </div>

    <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;line-height:1.7;text-align:center;margin:24px 0 0">
      Your responses will be seen by ${ownerName} and their archive custodian.<br>
      They are stored permanently as part of ${archiveName}.
    </p>
  </div>

  <div style="padding:20px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
      BASALITH &middot; XYZ<br>
      ${archiveName} &middot; Generation I
    </p>
  </div>

</body>`,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-${archiveId}-${Date.now()}`,
        'Precedence':       'bulk',
      },
    })

    // Log
    supabaseAdmin.from('owner_notifications').insert({
      archive_id: archiveId,
      type:       'witness_invitation',
      subject:    `Witness invitation sent to ${contributorName || contributorEmail}`,
      sent_to:    contributorEmail,
      sent_at:    new Date().toISOString(),
      metadata:   { contributorName, relationship, sessionId: session.id },
    }).then(() => {})

    return NextResponse.json({ sessionId: session.id, sessionUrl })
  } catch (err: any) {
    console.error('invite-witness POST:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
