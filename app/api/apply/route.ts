import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

// ── Spam hardening ──────────────────────────────────────────────────────────

// Conservative gibberish heuristic. Only fires on long, single-token,
// pure-ASCII-alphanumeric strings -- never on names/messages containing
// spaces, punctuation, or non-ASCII (Chinese, Vietnamese, accented, etc).
function looksLikeBotToken(s: string): boolean {
  const t = s.trim()
  if (!/^[A-Za-z0-9]+$/.test(t)) return false // non-ASCII or has spaces/punctuation: pass
  if (t.length < 16) return false             // short single tokens: pass
  const vowels = (t.match(/[aeiouAEIOU]/g) || []).length
  const caseFlips = (t.match(/[a-z][A-Z]/g) || []).length
  return vowels / t.length < 0.25 || caseFlips >= 4
}

// In-memory IP rate limiter: 5 submissions per IP per hour. Soft limit --
// resets per serverless instance. The honeypot is the primary defense.
const submissionLog = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const hits = (submissionLog.get(ip) || []).filter((t) => now - t < windowMs)
  hits.push(now)
  submissionLog.set(ip, hits)
  if (submissionLog.size > 5000) submissionLog.clear() // memory guard
  return hits.length > 5
}

export async function POST(req: NextRequest) {
  try {
    const {
      name, email, subject, reason, referralSource, company_website,
      applyType: rawApplyType, companyName, industry, employees, successionTimeline,
    } = await req.json()

    const applyType = ['legacy', 'succession', 'acquisition'].includes(rawApplyType)
      ? rawApplyType
      : 'legacy'
    const isBusiness = applyType === 'succession' || applyType === 'acquisition'

    if (!name || !email || !reason || !referralSource || (!isBusiness && !subject)) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    // 2a. Honeypot — bots fill every field, including the decoy.
    if (typeof company_website === 'string' && company_website.length > 0) {
      console.warn('[spam-drop] honeypot', { ip })
      return NextResponse.json({ success: true })
    }

    // 2b. Gibberish heuristics — conservative, ASCII-only.
    if (looksLikeBotToken(name) || looksLikeBotToken(reason)) {
      console.warn('[spam-drop] heuristic', { ip })
      return NextResponse.json({ success: true })
    }

    // 2c. Rate limit by IP — soft, in-memory.
    if (rateLimited(ip)) {
      console.warn('[spam-drop] rate-limit', { ip })
      return NextResponse.json({ success: true })
    }

    // Save to Supabase
    const { error: dbError } = await supabaseAdmin
      .from('archive_applications')
      .insert({
        name,
        email,
        subject:           isBusiness ? null : subject,
        reason,
        referral_source:   referralSource,
        apply_type:        applyType,
        company_name:      isBusiness ? companyName : null,
        industry:          isBusiness ? industry : null,
        employees:         isBusiness ? employees : null,
        business_timeline: isBusiness ? successionTimeline : null,
        status:            'pending',
      })

    if (dbError) {
      console.error('[apply] DB insert error:', dbError.message)
      // Non-fatal — still send the notification
    }

    // Notify the team. Business leads also copy David's personal inbox.
    const adminEmail = process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'
    const to = isBusiness ? ['mrdavidha@gmail.com', adminEmail] : [adminEmail]

    const leadTypeLabel =
      applyType === 'succession'   ? 'Business Succession'
      : applyType === 'acquisition' ? 'Business Acquisition'
      : 'Personal Legacy'

    const emailSubject =
      applyType === 'succession'   ? `New Succession Lead: ${name}`
      : applyType === 'acquisition' ? `New Acquisition Lead: ${name}`
      : `New Archive Application: ${name}`

    const tdLabel = 'font-family: monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; padding: 12px 16px 12px 0; vertical-align: top; white-space: nowrap;'
    const tdValue = 'font-size: 15px; padding: 12px 0; border-bottom: 1px solid #f0f0f0;'
    const row = (label: string, value: string) =>
      `<tr><td style="${tdLabel}">${label}</td><td style="${tdValue}">${value}</td></tr>`

    const detailRows = [
      row('Lead Type', leadTypeLabel),
      !isBusiness && subject     ? row('Archive Subject', subject) : '',
      isBusiness && companyName  ? row('Company', companyName) : '',
      isBusiness && industry     ? row('Industry', industry) : '',
      isBusiness && employees    ? row('Employees', employees) : '',
      isBusiness && successionTimeline
        ? row(applyType === 'acquisition' ? 'Deal Stage' : 'Timeline', successionTimeline)
        : '',
      referralSource             ? row('Referral Source', referralSource) : '',
    ].filter(Boolean).join('')

    await resend.emails.send({
      from:    'Basalith <davidha@basalith.xyz>',
      to,
      replyTo: email,
      subject: emailSubject,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-apply-${Date.now()}`,
        'Precedence':       'bulk',
      },
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
            ${detailRows}
            <tr>
              <td style="font-family: monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; padding: 12px 16px 12px 0; vertical-align: top; white-space: nowrap;">Their Message</td>
              <td style="font-size: 15px; line-height: 1.7; padding: 12px 0;">${reason.replace(/\n/g, '<br />')}</td>
            </tr>
          </table>

          <div style="margin-top: 40px; padding: 16px; background: #fffbf0; border-left: 3px solid #C4A24A;">
            <p style="font-family: monospace; font-size: 11px; color: #888; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.15em;">Next Step</p>
            <p style="margin: 0; font-size: 14px; color: #333;">Reply to this email to approve and assign a Legacy Guide. Your reply goes directly to ${name} at ${email}.</p>
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
