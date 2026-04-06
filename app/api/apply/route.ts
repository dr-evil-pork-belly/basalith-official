import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, reason, referralSource } = await req.json()

    if (!name || !email || !subject || !reason || !referralSource) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    // Save to Supabase
    const { error: dbError } = await supabaseAdmin
      .from('archive_applications')
      .insert({
        name,
        email,
        subject,
        reason,
        referral_source: referralSource,
        status:          'pending',
      })

    if (dbError) {
      console.error('[apply] DB insert error:', dbError.message)
      // Non-fatal — still send the notification
    }

    // Notify legacy@basalith.xyz
    await resend.emails.send({
      from:    'Basalith <noreply@basalith.xyz>',
      to:      'legacy@basalith.xyz',
      replyTo: email,
      subject: `New Archive Application — ${name}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; color: #1a1a1a; padding: 32px;">
          <p style="font-family: monospace; font-size: 11px; letter-spacing: 0.2em; color: #888; text-transform: uppercase; margin: 0 0 24px;">
            New Archive Application · Basalith
          </p>

          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">${name}</h1>
          <p style="font-size: 14px; color: #555; margin: 0 0 32px;">
            <a href="mailto:${email}" style="color: #C4A24A;">${email}</a>
          </p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="font-family: monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; padding: 12px 16px 12px 0; vertical-align: top; white-space: nowrap;">Archive Subject</td>
              <td style="font-size: 15px; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">${subject}</td>
            </tr>
            <tr>
              <td style="font-family: monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; padding: 12px 16px 12px 0; vertical-align: top; white-space: nowrap;">Referral Source</td>
              <td style="font-size: 15px; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">${referralSource}</td>
            </tr>
            <tr>
              <td style="font-family: monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; padding: 12px 16px 12px 0; vertical-align: top; white-space: nowrap;">Their Message</td>
              <td style="font-size: 15px; line-height: 1.7; padding: 12px 0;">${reason.replace(/\n/g, '<br />')}</td>
            </tr>
          </table>

          <div style="margin-top: 40px; padding: 16px; background: #fffbf0; border-left: 3px solid #C4A24A;">
            <p style="font-family: monospace; font-size: 11px; color: #888; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.15em;">Next Step</p>
            <p style="margin: 0; font-size: 14px; color: #333;">Reply to this email to approve and assign an Archivist. Your reply goes directly to ${name} at ${email}.</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[apply] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
