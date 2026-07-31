import { NextResponse } from 'next/server'

/**
 * RETIRED July 2026. Returns 410 to every caller, authenticated or not.
 *
 * Why: this route had no caller authentication. It read `archivistId` from the
 * request body, confirmed only that the id named a row in `archivists` with
 * status 'active', and then created an `archives` row, an `archive_credentials`
 * row, a Supabase Auth user, a `commissions` row at amount_cents 100000, and a
 * `prospects` row, and sent a client welcome email plus an admin notification.
 * It also had no idempotency guard of any kind, so two identical posts produced
 * two of everything. That is the most likely explanation for the four duplicate
 * empty Calder Archive rows.
 *
 * Client onboarding now runs through app/api/admin/checkout, which is god-authed
 * and generates a founding checkout. The page above this route,
 * app/archivist/onboard/page.tsx, was already reduced to a static notice
 * pointing at the same place, so no user interface reached this handler.
 *
 * Retired rather than gated on purpose. Gating it would have hardened a second
 * live way to create archives. Removing it leaves one provisioning path,
 * lib/billing/createArchive.ts called by provisionOnFoundingFee.
 *
 * The original handler is preserved below rather than deleted, so the behavior
 * that ran in production is still readable. Two mechanical changes were needed
 * to keep the file lint-clean and inside the repo copy rules. The imports it
 * used were removed from the top of this file (NextRequest, supabaseAdmin,
 * resend, createArchiveWithCredentials), and the single em dash in its comment
 * on the welcome-email catch was normalized to a period. No executable line was
 * altered.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Client onboarding has moved. Contact your Basalith administrator to generate a founding checkout.',
    },
    { status: 410 },
  )
}

/* ORIGINAL HANDLER, retired July 2026. Preserved for reference, not executed.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { createArchiveWithCredentials } from '@/lib/billing/createArchive'

function buildWelcomeEmail(
  familyName:    string,
  firstName:     string,
  tierName:      string,
  archivistName: string,
  magicLinkUrl:  string | null,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px">
    THE ${familyName.toUpperCase()} ARCHIVE
  </p>
  <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F0EDE6;margin:0 0 16px">
    Welcome to Basalith, ${firstName}.
  </h1>
  <p style="font-size:16px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
    Your archive has been initialized. ${archivistName} will be in touch shortly to schedule your Founding Session.
  </p>

  ${magicLinkUrl ? `
  <div style="background:rgba(196,162,74,0.08);border:1px solid rgba(196,162,74,0.3);border-top:3px solid rgba(196,162,74,0.8);padding:24px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px;text-transform:uppercase">
      Your Personal Archive Link
    </p>
    <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
      Click the link below to access your archive. No password required.
    </p>
    <a href="${magicLinkUrl}" style="display:inline-block;font-family:'Courier New',monospace;font-size:12px;color:#C4A24A;word-break:break-all;margin:0 0 12px">
      ${magicLinkUrl}
    </a>
    <p style="font-size:13px;font-style:italic;color:#706C65;margin:0;line-height:1.7">
      This link signs you in directly. If it expires, request a new one any time at ${siteUrl}/archive-login.
    </p>
  </div>
  ` : `
  <div style="background:rgba(196,162,74,0.04);border:1px solid rgba(196,162,74,0.15);padding:24px;margin:0 0 24px">
    <p style="font-size:14px;color:#B8B4AB;margin:0 0 8px">
      Sign in any time at <strong style="color:#F0EDE6">${siteUrl}/archive-login</strong> with this email address. We will send you a sign-in link.
    </p>
    <p style="font-size:14px;color:#B8B4AB;margin:0">
      <strong style="color:#F0EDE6">Tier:</strong> ${tierName}
    </p>
  </div>
  `}

  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
    Once you are inside you can begin uploading photographs. Our AI will analyze everything, removing screenshots and unrelated images automatically.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
    Your Founding Session with ${archivistName} is being scheduled. You will hear from them within 24 hours.
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
    const { archivistId, familyName, clientEmail, clientName, tier, notes } = await req.json()

    if (!archivistId || !familyName || !clientEmail || !tier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── 1. Verify archivist ───────────────────────────────────────────────────
    const { data: archivist } = await supabaseAdmin
      .from('archivists')
      .select('id, name, status')
      .eq('id', archivistId)
      .single()

    if (!archivist || archivist.status !== 'active') {
      return NextResponse.json({ error: 'Archivist not found or inactive' }, { status: 404 })
    }

    // ── 2-4. Create archive + credentials + owner auth user (shared helper) ───
    // Same operations as before, now shared with the paid Stripe provisioning
    // path (Inngest provisionOnFoundingFee). credentialsCreatedBy preserves the
    // original archive_credentials.created_by; submittedBy is intentionally
    // omitted so the archives row is identical to the pre-refactor insert.
    const { archive, magicLinkUrl } = await createArchiveWithCredentials({
      familyName,
      ownerEmail:           clientEmail,
      ownerName:            clientName || null,
      tier,
      credentialsCreatedBy: archivistId,
    })

    // ── 5. Record founding commission ($1,000) ────────────────────────────────
    // Live `commissions` columns: type / amount_cents / status / description.
    // prospect_id is omitted (nullable): the prospect row is created below and its
    // id is not captured here, so there is nothing to pass.
    const { error: commissionError } = await supabaseAdmin
      .from('commissions')
      .insert({
        archivist_id: archivistId,
        type:         'founding',
        amount_cents: 100000, // $1,000 in cents
        status:       'pending',
        description:  `${familyName} Archive, ${tier} tier founding`,
      })

    if (commissionError) {
      console.error('[onboard-client] Founding commission write failed:', commissionError.message)
    }

    // ── 6. Update archivist stats via increment_closings rpc ─────────────────
    await supabaseAdmin
      .rpc('increment_closings', { archivist_id: archivistId })
      .maybeSingle()
      .then(() => {})

    // ── 7. Add to prospects as active client ──────────────────────────────────
    await supabaseAdmin
      .from('prospects')
      .insert({
        archivist_id: archivistId,
        name:         clientName || familyName,
        contact:      clientEmail,
        status:       'Active Client',
        tier,
        next_action:  'Schedule Founding Session',
        notes:        notes || '',
      })
      .then(() => {})

    // ── 8. Send welcome email to client ───────────────────────────────────────
    const tierNames: Record<string, string> = { archive: 'The Archive', estate: 'The Estate', dynasty: 'The Dynasty' }
    const tierName = tierNames[tier] || 'The Estate'
    const firstName = (clientName || familyName).split(' ')[0]
    // magicLinkUrl is produced by the shared helper above.
    try {
      await resend.emails.send({
        from:    `The ${familyName} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      clientEmail,
        subject: `Welcome to Basalith. The ${familyName} Archive is ready.`,
        html:    buildWelcomeEmail(familyName, firstName, tierName, archivist.name, magicLinkUrl),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      })
    } catch (emailErr: unknown) {
      console.error('[onboard-client] Welcome email failed:', emailErr instanceof Error ? emailErr.message : emailErr)
      // Non-fatal. Archive is created and reachable at /archive-login regardless
    }

    // ── 9. Notify admin ───────────────────────────────────────────────────────
    try {
      await resend.emails.send({
        from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz',
        subject: `New Archive: The ${familyName} Archive (${tier}) via ${archivist.name}`,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
        html: `<p><strong>New archive initialized</strong></p>
          <p>Family: The ${familyName} Archive</p>
          <p>Client: ${clientName} (${clientEmail})</p>
          <p>Tier: ${tierName}</p>
          <p>Archivist: ${archivist.name}</p>
          <p>Archive ID: ${archive.id}</p>
          ${commissionError
            ? `<p style="color:#c0392b"><strong>COMMISSION WRITE FAILED:</strong> ${commissionError.message}</p>`
            : `<p>Commission recorded: $1,000 pending</p>`}`,
      })
    } catch (adminEmailErr: unknown) {
      console.error('[onboard-client] Admin notification failed:', adminEmailErr instanceof Error ? adminEmailErr.message : adminEmailErr)
    }

    return NextResponse.json({
      success:      true,
      archiveId:    archive.id,
      archiveName:  `The ${familyName} Archive`,
      clientEmail,
      magicLink:    magicLinkUrl,
      message:      `The ${familyName} Archive has been initialized. A sign-in link was sent to ${clientEmail}.`,
    })

  } catch (error: any) {
    console.error('[onboard-client]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

*/
