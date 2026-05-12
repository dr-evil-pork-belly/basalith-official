import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { archiveId, labelId } = await req.json()

    if (!archiveId || !labelId) {
      return NextResponse.json({ error: 'archiveId and labelId required' }, { status: 400 })
    }

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('id, name, owner_email, owner_name')
      .eq('id', archiveId)
      .single()

    if (!archive?.owner_email) {
      return NextResponse.json({ skipped: true, reason: 'No owner email' })
    }

    const { data: label } = await supabaseAdmin
      .from('labels')
      .select('*, photographs(ai_era_estimate)')
      .eq('id', labelId)
      .single()

    if (!label) {
      return NextResponse.json({ skipped: true, reason: 'Label not found' })
    }

    const contributor = label.labelled_by || 'A contributor'
    const firstName   = contributor.includes('@') ? 'Someone' : contributor.split(' ')[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eraEstimate = (label as any).photographs?.ai_era_estimate
    const story       = (label.what_was_happening || label.story_extracted || '').slice(0, 150)
    const archiveName = archive.name || 'Your Archive'

    await resend.emails.send({
      from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      archive.owner_email,
      subject: `${firstName} just remembered something · ${archiveName}`,
      html: `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">

  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase;margin:0 0 24px">
    ${archiveName.toUpperCase()}
  </p>

  <p style="font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6;margin:0 0 20px">
    ${firstName} added a memory${eraEstimate ? ' to your ' + eraEstimate + ' photograph' : ''}.
  </p>

  ${story ? `
  <blockquote style="border-left:2px solid rgba(196,162,74,0.4);padding-left:16px;margin:0 0 28px;font-style:italic;color:#B8B4AB;font-size:15px;line-height:1.7">
    &ldquo;${story}${story.length >= 150 ? '&hellip;' : ''}&rdquo;
  </blockquote>
  ` : ''}

  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://basalith.xyz'}/archive/gallery"
    style="display:inline-block;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#C4A24A;text-decoration:none;border:1px solid rgba(196,162,74,0.3);padding:10px 20px">
    VIEW IN ARCHIVE &rarr;
  </a>

  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:32px 0">

  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
    BASALITH &middot; XYZ<br>${archiveName} &middot; Generation I
  </p>

</body>`,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-${archiveId}-${Date.now()}`,
        'Precedence':       'bulk',
      },
    })

    await supabaseAdmin.from('owner_notifications').insert({
      archive_id: archiveId,
      type:       'contribution_alert',
      subject:    `${firstName} just remembered something`,
      sent_to:    archive.owner_email,
      sent_at:    new Date().toISOString(),
      metadata:   { labelId, contributor },
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Contribution alert error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
