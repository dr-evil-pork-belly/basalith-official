import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { archiveId } = await req.json()

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('id, name, owner_email, owner_name')
      .eq('id', archiveId)
      .single()

    if (!archive?.owner_email) {
      return NextResponse.json({ skipped: true, reason: 'No owner email' })
    }

    // Find the most recently labeled photograph with at least one contributor label
    const { data: recentLabels } = await supabaseAdmin
      .from('labels')
      .select('photograph_id, what_was_happening, labelled_by, created_at')
      .eq('archive_id', archiveId)
      .eq('is_primary_label', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!recentLabels?.length) {
      return NextResponse.json({ skipped: true, reason: 'No contributor labels to prompt from' })
    }

    const label         = recentLabels[0]
    const contributor   = label.labelled_by || 'A contributor'
    const firstName     = contributor.includes('@') ? 'Someone' : contributor.split(' ')[0]
    const story         = (label.what_was_happening || '').slice(0, 120)
    const photographId  = label.photograph_id
    const archiveName   = archive.name || 'Your Archive'
    const ownerFirst    = archive.owner_name?.split(' ')[0] || 'there'
    const depositUrl    = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://basalith.xyz'}/archive/deposit?photographId=${photographId}`

    await resend.emails.send({
      from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      archive.owner_email,
      subject: `A question for you · ${archiveName}`,
      html: `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">

  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase;margin:0 0 24px">
    ${archiveName.toUpperCase()}
  </p>

  <p style="font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6;margin:0 0 20px">
    ${firstName} remembered${story ? ':' : ' something.'}
  </p>

  ${story ? `
  <blockquote style="border-left:2px solid rgba(196,162,74,0.4);padding-left:16px;margin:0 0 28px;font-style:italic;color:#B8B4AB;font-size:15px;line-height:1.7">
    &ldquo;${story}${story.length >= 120 ? '&hellip;' : ''}&rdquo;
  </blockquote>
  ` : ''}

  <p style="font-size:16px;font-weight:300;color:#9DA3A8;line-height:1.75;margin:0 0 28px">
    Is there something you want to add about that moment, ${ownerFirst}?<br>
    Something only you would know.
  </p>

  <a href="${depositUrl}"
    style="display:inline-block;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#C4A24A;text-decoration:none;border:1px solid rgba(196,162,74,0.3);padding:10px 20px">
    ADD YOUR MEMORY &rarr;
  </a>

  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:32px 0">

  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
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
      type:       'deposit_prompt',
      subject:    'A question for you',
      sent_to:    archive.owner_email,
      sent_at:    new Date().toISOString(),
      metadata:   { photographId, contributor },
    })

    return NextResponse.json({ success: true, photographId })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Deposit prompt error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
