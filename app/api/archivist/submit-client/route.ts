import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import bcrypt from 'bcryptjs'

function generateMagicLinkToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateClientPassword(familyName: string): string {
  const clean = familyName.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${clean}${new Date().getFullYear()}${suffix}!`
}

const TIER_PRICES: Record<string, { annual: number; monthly: number; label: string; oneTime?: boolean }> = {
  active:  { annual: 3600, monthly: 360, label: 'Active'  },
  resting: { annual: 600,  monthly: 60,  label: 'Resting' },
  legacy:  { annual: 2500, monthly: 0,   label: 'Legacy', oneTime: true },
  // Legacy aliases for any existing records
  archive: { annual: 3600, monthly: 360, label: 'Active' },
  estate:  { annual: 3600, monthly: 360, label: 'Active' },
  dynasty: { annual: 3600, monthly: 360, label: 'Active' },
}

const FOUNDING_FEE = 2500

function buildClientEmail(
  familyName:    string,
  firstName:     string,
  guideName:     string,
  paymentUrl:    string,
  tierLabel:     string,
  billing:       string,
  totalDue:      number,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 24px">
    BASALITH · HERITAGE NEXUS INC.
  </p>

  <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:300;color:#F0EDE6;margin:0 0 20px;line-height:1.2">
    Your Basalith archive<br>is being prepared.
  </h1>

  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 12px">
    ${guideName} has submitted your application to Basalith.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
    Your Legacy Guide will be in touch within 24 hours to schedule your Founding Session.
  </p>

  <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.25);border-top:2px solid rgba(196,162,74,0.7);padding:28px;margin:0 0 28px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px;text-transform:uppercase">
      Your Selected Plan
    </p>
    <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.6;margin:0 0 16px">
      ${tierLabel} &middot; ${billing === 'annual' ? 'Annual billing' : 'Monthly billing'}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px;text-transform:uppercase">
      Founding Investment
    </p>
    <p style="font-size:24px;font-weight:300;color:#F0EDE6;line-height:1;margin:0 0 6px;letter-spacing:-0.02em">
      $${totalDue.toLocaleString('en-US')}
    </p>
    <p style="font-size:13px;font-style:italic;color:#706C65;margin:0 0 20px">
      One-time founding fee of $${FOUNDING_FEE.toLocaleString('en-US')} + first ${billing === 'annual' ? 'year' : 'month'}
    </p>
    <a href="${paymentUrl}"
      style="display:inline-block;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0A0908;background:#C4A24A;text-decoration:none;padding:14px 32px">
      Complete Your Founding
    </a>
  </div>

  <p style="font-size:14px;font-style:italic;color:#706C65;line-height:1.8;margin:0 0 32px">
    Questions? Reply to this email or contact your Legacy Guide directly.
  </p>

  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
    BASALITH · XYZ<br>
    The ${familyName} Archive · Generation I<br>
    Heritage Nexus Inc. · Wilmington, Delaware
  </p>
</body>
</html>`
}

function buildAdminEmail(
  familyName:       string,
  clientName:       string,
  clientEmail:      string,
  phone:            string,
  tierLabel:        string,
  billing:          string,
  guideName:        string,
  guideEmail:       string,
  relationshipType: string,
  guideNotes:       string,
  archiveId:        string,
  totalDue:         number,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    New Client Submission
  </p>
  <h1 style="font-size:22px;font-weight:300;color:#F0EDE6;margin:0 0 24px">
    New client submitted by ${guideName}
  </h1>

  <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
    ${[
      ['Client',       clientName],
      ['Email',        clientEmail],
      ['Phone',        phone || 'Not provided'],
      ['Tier',         tierLabel],
      ['Billing',      billing === 'annual' ? 'Annual' : 'Monthly'],
      ['Total Due',    `$${totalDue.toLocaleString('en-US')}`],
      ['Guide',        `${guideName} (${guideEmail})`],
      ['Relationship', relationshipType],
      ['Archive ID',   archiveId],
    ].map(([k, v]) => `
    <tr>
      <td style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;text-transform:uppercase;padding:8px 16px 8px 0;vertical-align:top;white-space:nowrap">${k}</td>
      <td style="font-size:14px;color:#B8B4AB;padding:8px 0">${v}</td>
    </tr>`).join('')}
  </table>

  ${guideNotes ? `
  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);padding:16px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;text-transform:uppercase;margin:0 0 8px">Guide Notes</p>
    <p style="font-size:14px;color:#B8B4AB;line-height:1.7;margin:0;font-style:italic">${guideNotes}</p>
  </div>
  ` : ''}

  <p style="font-size:13px;font-style:italic;color:#706C65;line-height:1.8;margin:0">
    Archive status: pending_payment. Payment email sent to client.
  </p>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const {
      archivistId,
      familyName,
      clientName,
      clientEmail,
      phone,
      tier,
      billing = 'annual',
      relationshipType,
      notes,
    } = await req.json()

    if (!archivistId || !familyName || !clientEmail || !tier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── 1. Verify archivist ───────────────────────────────────────────────────
    const { data: archivist } = await supabaseAdmin
      .from('archivists')
      .select('id, name, email, status')
      .eq('id', archivistId)
      .single()

    if (!archivist || archivist.status !== 'active') {
      return NextResponse.json({ error: 'Archivist not found or inactive' }, { status: 404 })
    }

    // ── 2. Pre-generate credentials (stored, not sent until payment) ──────────
    const password        = generateClientPassword(familyName)
    const passwordHash    = await bcrypt.hash(password, 12)
    const magicLinkToken  = generateMagicLinkToken()

    // ── 3. Create archive as pending_payment ──────────────────────────────────
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('archives')
      .insert({
        name:                 `The ${familyName} Archive`,
        family_name:          familyName,
        owner_email:          clientEmail,
        owner_name:           clientName || null,
        owner_phone:          phone || null,
        tier,
        billing,
        relationship_type:    relationshipType || null,
        guide_notes:          notes || null,
        submitted_by:         archivistId,
        generation:           'Generation I',
        status:               'pending_payment',
        magic_link_token:     magicLinkToken,
        magic_link_created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (archiveError || !archive) {
      throw new Error(archiveError?.message || 'Failed to create archive')
    }

    // ── 4. Store credentials (inactive until payment) ─────────────────────────
    await supabaseAdmin
      .from('archive_credentials')
      .insert({
        archive_id:    archive.id,
        password_hash: passwordHash,
        created_by:    archivistId,
        is_active:     false,
      })
      .then(() => {})

    // ── 5. Add to prospects as Payment Pending ────────────────────────────────
    await supabaseAdmin
      .from('prospects')
      .insert({
        archivist_id: archivistId,
        name:         clientName || familyName,
        contact:      clientEmail,
        status:       'Payment Pending',
        tier,
        next_action:  'Client payment required',
        notes:        notes || '',
      })
      .then(() => {})

    // ── 6. Build payment URL ──────────────────────────────────────────────────
    const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const tierData    = TIER_PRICES[tier] ?? TIER_PRICES.active
    const tierLabel   = tierData.label
    const firstPeriod = tierData.oneTime
      ? tierData.annual
      : billing === 'annual' ? tierData.annual : tierData.monthly
    const totalDue    = FOUNDING_FEE + firstPeriod

    // If STRIPE_PAYMENT_LINK_URL is configured, use it; otherwise fall back to pricing page.
    // Wire Stripe checkout session creation here once STRIPE_SECRET_KEY is set.
    const basePaymentUrl = process.env.STRIPE_PAYMENT_LINK_URL ?? `${siteUrl}/pricing`
    const paymentUrl     = `${basePaymentUrl}?archive=${archive.id}&tier=${tier}&billing=${billing}`

    // Store the payment URL on the archive record
    await supabaseAdmin
      .from('archives')
      .update({ payment_url: paymentUrl })
      .eq('id', archive.id)
      .then(() => {})

    // ── 7. Send email to David (admin) ────────────────────────────────────────
    try {
      await resend.emails.send({
        from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz',
        subject: `New client submitted by ${archivist.name} — The ${familyName} Archive`,
        headers: {
          'X-Entity-Ref-ID': `basalith-submit-${archive.id}-${Date.now()}`,
          'Precedence':      'bulk',
        },
        html: buildAdminEmail(
          familyName, clientName || familyName, clientEmail, phone || '',
          tierLabel, billing, archivist.name, archivist.email ?? '',
          relationshipType || 'Not specified', notes || '', archive.id, totalDue,
        ),
      })
    } catch (err: unknown) {
      console.error('[submit-client] Admin email failed:', err instanceof Error ? err.message : err)
    }

    // ── 8. Send email to client ───────────────────────────────────────────────
    const firstName = (clientName || familyName).split(' ')[0]
    try {
      await resend.emails.send({
        from:    `${archivist.name} via Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      clientEmail,
        subject: `Your Basalith archive is being prepared`,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-client-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
        html: buildClientEmail(
          familyName, firstName, archivist.name,
          paymentUrl, tierLabel, billing, totalDue,
        ),
      })
    } catch (err: unknown) {
      console.error('[submit-client] Client email failed:', err instanceof Error ? err.message : err)
    }

    return NextResponse.json({
      success:     true,
      archiveId:   archive.id,
      archiveName: `The ${familyName} Archive`,
      clientEmail,
      tierLabel,
      billing,
      totalDue,
    })

  } catch (error: unknown) {
    console.error('[submit-client]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
