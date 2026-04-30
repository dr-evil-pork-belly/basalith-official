/**
 * Stripe webhook handler — activates archives on payment completion.
 *
 * Wiring Stripe:
 *   1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in env
 *   2. Register this endpoint in Stripe dashboard: POST /api/stripe/webhook
 *   3. Listen for: checkout.session.completed
 *   4. Pass metadata: { archiveId: string } when creating checkout sessions
 *
 * Manual activation (for testing or admin override):
 *   POST /api/stripe/webhook
 *   Body: { archiveId: string, _manual: true }
 *   Header: x-manual-secret: <MANUAL_ACTIVATION_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

function buildGuideActivationEmail(
  guideName:   string,
  clientName:  string,
  familyName:  string,
  tierLabel:   string,
  archiveId:   string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    Client Activated
  </p>
  <h1 style="font-size:22px;font-weight:300;color:#F0EDE6;margin:0 0 20px;line-height:1.2">
    ${clientName} has completed their founding investment.
  </h1>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 20px">
    The ${familyName} Archive (${tierLabel}) is now active. Your commission of $1,000 has been recorded.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
    Schedule the Founding Session. This is where the archive begins.
  </p>
  <a href="${siteUrl}/archivist/pipeline"
    style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0A0908;background:#C4A24A;text-decoration:none;padding:12px 28px;display:inline-block">
    View in Pipeline
  </a>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:32px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830">
    BASALITH · Archive ID: ${archiveId}
  </p>
</body>
</html>`
}

function buildAdminActivationEmail(
  clientName:  string,
  clientEmail: string,
  familyName:  string,
  tierLabel:   string,
  billing:     string,
  guideName:   string,
  archiveId:   string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    New Active Client
  </p>
  <h1 style="font-size:22px;font-weight:300;color:#F0EDE6;margin:0 0 20px">
    The ${familyName} Archive is now active.
  </h1>
  <table style="width:100%;border-collapse:collapse">
    ${[
      ['Client',    clientName],
      ['Email',     clientEmail],
      ['Tier',      tierLabel],
      ['Billing',   billing === 'annual' ? 'Annual' : 'Monthly'],
      ['Guide',     guideName],
      ['Archive',   archiveId],
    ].map(([k, v]) => `
    <tr>
      <td style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;text-transform:uppercase;padding:8px 16px 8px 0;white-space:nowrap">${k}</td>
      <td style="font-size:14px;color:#B8B4AB;padding:8px 0">${v}</td>
    </tr>`).join('')}
  </table>
</body>
</html>`
}

function buildClientWelcomeEmail(
  familyName:   string,
  firstName:    string,
  guideName:    string,
  password:     string,
  magicLinkUrl: string,
  tierLabel:    string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    THE ${familyName.toUpperCase()} ARCHIVE
  </p>
  <h1 style="font-size:26px;font-weight:300;color:#F0EDE6;margin:0 0 16px">
    Welcome to Basalith, ${firstName}.
  </h1>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
    Your archive is active. ${guideName} will be in touch to schedule your Founding Session.
  </p>

  <div style="background:rgba(196,162,74,0.08);border:1px solid rgba(196,162,74,0.3);border-top:3px solid rgba(196,162,74,0.8);padding:24px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px;text-transform:uppercase">
      Your Personal Archive Link
    </p>
    <p style="font-size:14px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 12px">
      Click below to access your archive — no password required.
    </p>
    <a href="${magicLinkUrl}"
      style="display:inline-block;font-family:'Courier New',monospace;font-size:11px;color:#C4A24A;word-break:break-all;margin:0 0 10px">
      ${magicLinkUrl}
    </a>
    <p style="font-size:12px;font-style:italic;color:#706C65;margin:0;line-height:1.7">
      Bookmark this link. It is your personal entry to the archive.
    </p>
  </div>

  <div style="background:rgba(196,162,74,0.04);border:1px solid rgba(196,162,74,0.12);padding:20px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px;text-transform:uppercase">
      Password Login (alternative)
    </p>
    <p style="font-size:13px;color:#B8B4AB;margin:0 0 6px"><strong style="color:#F0EDE6">URL:</strong> ${siteUrl}/archive-login</p>
    <p style="font-size:13px;color:#B8B4AB;margin:0 0 6px"><strong style="color:#F0EDE6">Password:</strong> ${password}</p>
    <p style="font-size:13px;color:#B8B4AB;margin:0"><strong style="color:#F0EDE6">Tier:</strong> ${tierLabel}</p>
  </div>

  <p style="font-size:14px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
    Once inside, you can begin uploading photographs. Our AI will analyze everything automatically.
  </p>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:24px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
    BASALITH · XYZ<br>The ${familyName} Archive · Generation I<br>Heritage Nexus Inc.
  </p>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    let archiveId: string | null = null

    // ── Manual activation (admin override / testing) ──────────────────────────
    const manualSecret = req.headers.get('x-manual-secret')
    if (manualSecret && manualSecret === (process.env.MANUAL_ACTIVATION_SECRET ?? '')) {
      const payload = JSON.parse(body)
      if (payload._manual && payload.archiveId) {
        archiveId = payload.archiveId
      }
    }

    // ── Stripe checkout.session.completed ──────────────────────────────────────
    if (!archiveId) {
      // When STRIPE_WEBHOOK_SECRET is set, signature verification goes here.
      // For now, parse the event and extract archiveId from metadata.
      try {
        const event = JSON.parse(body)
        if (event.type === 'checkout.session.completed') {
          archiveId = event.data?.object?.metadata?.archiveId ?? null
        }
      } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }
    }

    if (!archiveId) {
      return NextResponse.json({ error: 'archiveId not found in payload' }, { status: 400 })
    }

    // ── Fetch archive ──────────────────────────────────────────────────────────
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('archives')
      .select('id, name, family_name, owner_email, owner_name, tier, billing, submitted_by, magic_link_token, status')
      .eq('id', archiveId)
      .single()

    if (archiveError || !archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
    }

    if (archive.status === 'active') {
      // Idempotency — already activated, return success
      return NextResponse.json({ ok: true, alreadyActive: true })
    }

    // ── Activate archive ───────────────────────────────────────────────────────
    await supabaseAdmin
      .from('archives')
      .update({ status: 'active' })
      .eq('id', archiveId)

    // ── Activate credentials ───────────────────────────────────────────────────
    await supabaseAdmin
      .from('archive_credentials')
      .update({ is_active: true })
      .eq('archive_id', archiveId)
      .then(() => {})

    // ── Update prospect status ─────────────────────────────────────────────────
    await supabaseAdmin
      .from('prospects')
      .update({ status: 'Active Client', next_action: 'Schedule Founding Session', closed_at: new Date().toISOString() })
      .eq('contact', archive.owner_email)
      .eq('archivist_id', archive.submitted_by)
      .then(() => {})

    // ── Fetch archivist details ────────────────────────────────────────────────
    const { data: archivist } = archive.submitted_by
      ? await supabaseAdmin
          .from('archivists')
          .select('id, name, email')
          .eq('id', archive.submitted_by)
          .single()
      : { data: null }

    // ── Record $1,000 founding commission ────────────────────────────────────
    if (archivist) {
      await supabaseAdmin
        .from('commissions')
        .insert({
          archivist_id:    archivist.id,
          commission_type: 'founding_fee',
          amount:          1000,
          status:          'pending',
          notes:           `${archive.family_name} Archive, ${archive.tier} tier founding`,
        })
        .then(() => {})

      // ── Increment archivist closings ────────────────────────────────────────
      await supabaseAdmin
        .rpc('increment_closings', { archivist_id: archivist.id })
        .maybeSingle()
        .then(() => {})
    }

    // ── Fetch stored password from credentials ────────────────────────────────
    const { data: cred } = await supabaseAdmin
      .from('archive_credentials')
      .select('password_hash')
      .eq('archive_id', archiveId)
      .eq('is_active', true)
      .single()

    const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const magicLinkUrl = `${siteUrl}/api/archive/magic-login?token=${archive.magic_link_token}`
    const tierNames: Record<string, string> = { archive: 'The Archive', estate: 'The Estate', dynasty: 'The Dynasty' }
    const tierLabel    = tierNames[archive.tier] ?? 'The Estate'
    const familyName   = archive.family_name ?? ''
    const clientName   = archive.owner_name ?? familyName
    const firstName    = clientName.split(' ')[0]

    // We stored the plaintext password in bcrypt — we can't recover it, so
    // we regenerate one and update the hash. This is the activation password.
    const { default: bcrypt } = await import('bcryptjs')
    const newPassword    = `${familyName.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '')}${new Date().getFullYear()}${Math.random().toString(36).slice(2, 6).toUpperCase()}!`
    const newHash        = await bcrypt.hash(newPassword, 12)
    await supabaseAdmin
      .from('archive_credentials')
      .update({ password_hash: newHash })
      .eq('archive_id', archiveId)
      .then(() => {})

    // ── Email guide: "Client activated" ───────────────────────────────────────
    if (archivist) {
      try {
        await resend.emails.send({
          from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      archivist.email,
          subject: `Client activated — The ${familyName} Archive`,
          headers: { 'X-Entity-Ref-ID': `basalith-guide-act-${archiveId}` },
          html:    buildGuideActivationEmail(archivist.name, clientName, familyName, tierLabel, archiveId),
        })
      } catch (e) {
        console.error('[webhook] Guide activation email failed:', e)
      }
    }

    // ── Email admin: "New active client" ──────────────────────────────────────
    try {
      await resend.emails.send({
        from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz',
        subject: `New active client — The ${familyName} Archive (${tierLabel})`,
        headers: { 'X-Entity-Ref-ID': `basalith-admin-act-${archiveId}` },
        html:    buildAdminActivationEmail(
          clientName, archive.owner_email, familyName, tierLabel,
          archive.billing ?? 'annual', archivist?.name ?? 'Unknown guide', archiveId,
        ),
      })
    } catch (e) {
      console.error('[webhook] Admin activation email failed:', e)
    }

    // ── Email client: welcome with credentials ────────────────────────────────
    try {
      await resend.emails.send({
        from:    `The ${familyName} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject: `Welcome to Basalith. The ${familyName} Archive is ready.`,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-client-act-${archiveId}`,
          'Precedence':       'bulk',
        },
        html: buildClientWelcomeEmail(
          familyName, firstName, archivist?.name ?? 'your Legacy Guide',
          newPassword, magicLinkUrl, tierLabel,
        ),
      })
    } catch (e) {
      console.error('[webhook] Client welcome email failed:', e)
    }

    return NextResponse.json({ ok: true, archiveId, activated: true })

  } catch (error: unknown) {
    console.error('[stripe/webhook]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
