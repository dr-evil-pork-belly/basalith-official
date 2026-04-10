import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { archiveId, contributorEmail, contributorName, photographId, ownerName } = body

    if (!archiveId || !contributorEmail) {
      return NextResponse.json({ error: 'archiveId and contributorEmail required' }, { status: 400 })
    }

    // Get archive info
    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('name, family_name')
      .eq('id', archiveId)
      .single()

    if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

    // Upsert contributor record
    await supabaseAdmin.from('contributors').upsert({
      archive_id: archiveId,
      email:      contributorEmail.trim(),
      name:       contributorName?.trim() ?? null,
      status:     'active',
    }, { onConflict: 'archive_id,email' })

    // If there's a photograph, create a session so their reply is captured
    let replyAddress = `${archive.family_name.toLowerCase().replace(/\s+/g, '-')}-invite@${process.env.RESEND_REPLY_DOMAIN ?? 'zoibrenae.resend.app'}`
    let photographUrl: string | null = null

    if (photographId) {
      const { data: photo } = await supabaseAdmin
        .from('photographs')
        .select('storage_path, ai_era_estimate')
        .eq('id', photographId)
        .single()

      if (photo?.storage_path) {
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from('photographs')
          .createSignedUrl(photo.storage_path, 86400)
        photographUrl = signedUrlData?.signedUrl ?? null

        // Create a session so reply is routed correctly
        const sessionCode = Math.random().toString(36).substring(2, 8)
        const familySlug  = archive.family_name.toLowerCase().replace(/\s+/g, '-')
        replyAddress      = `${familySlug}-${sessionCode}@${process.env.RESEND_REPLY_DOMAIN ?? 'zoibrenae.resend.app'}`

        await supabaseAdmin.from('email_sessions').insert({
          archive_id:          archiveId,
          photograph_id:       photographId,
          sent_at:             new Date().toISOString(),
          reply_window_closes: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          recipients:          [contributorEmail],
          subject_line:        `A photograph from ${archive.name}`,
          reply_address:       replyAddress,
        })
      }
    }

    const senderName   = ownerName || archive.name
    const photoSection = photographUrl
      ? `<img src="${photographUrl}" alt="Archive photograph" style="display:block;width:100%;max-width:560px;height:auto;margin:0 0 24px" />`
      : ''

    const html = `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;text-transform:uppercase;margin:0 0 24px">
    ${archive.name}
  </p>
  ${photoSection}
  <p style="font-size:18px;font-style:italic;color:#F0EDE6;line-height:1.6;margin:0 0 16px">
    ${senderName} found a photograph you might remember.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
    ${senderName} is building ${archive.name} — a permanent record of the family's history.
    They found a photograph and thought you might know something about it.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
    Reply to this email with anything you remember. Your memory will be added to the archive permanently.
  </p>
  <p style="font-size:14px;font-style:italic;color:#706C65;line-height:1.6;margin:0 0 32px">
    You'll receive occasional photographs from the archive — one at a time, whenever something is found that you might know.
  </p>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:0 0 24px">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8">
    BASALITH · XYZ<br>${archive.name} · Generation I<br>Reply to share your memory
  </p>
</body>
</html>`

    await resend.emails.send({
      from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      contributorEmail,
      replyTo: replyAddress,
      subject: `${senderName} found a photograph you might remember · ${archive.name}`,
      html,
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('invite error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
