import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import bcrypt from 'bcryptjs'

function generateClientPassword(familyName: string): string {
  const clean = familyName.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${clean}${new Date().getFullYear()}${suffix}!`
}

function buildWelcomeEmail(
  familyName: string,
  firstName:  string,
  password:   string,
  tierName:   string,
  archivistName: string,
): string {
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
  <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);border-top:3px solid rgba(196,162,74,0.6);padding:24px;margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 16px;text-transform:uppercase">
      Your Login Details
    </p>
    <p style="font-size:14px;color:#B8B4AB;margin:0 0 8px">
      <strong style="color:#F0EDE6">URL:</strong> basalith.xyz/archive-login
    </p>
    <p style="font-size:14px;color:#B8B4AB;margin:0 0 8px">
      <strong style="color:#F0EDE6">Password:</strong> ${password}
    </p>
    <p style="font-size:14px;color:#B8B4AB;margin:0">
      <strong style="color:#F0EDE6">Tier:</strong> ${tierName}
    </p>
  </div>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
    Once you log in you can begin uploading photographs. Our AI will analyze everything — removing screenshots and unrelated photos automatically.
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

    // ── 2. Generate password ──────────────────────────────────────────────────
    const password     = generateClientPassword(familyName)
    console.log('[onboard-client] Generating password:', password)
    const passwordHash = await bcrypt.hash(password, 12)
    console.log('[onboard-client] Hash generated, length:', passwordHash.length)

    // ── 3. Create archive ─────────────────────────────────────────────────────
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('archives')
      .insert({
        name:        `The ${familyName} Archive`,
        family_name: familyName,
        owner_email: clientEmail,
        owner_name:  clientName || null,
        tier,
        generation:  'Generation I',
        status:      'active',
      })
      .select()
      .single()

    if (archiveError || !archive) {
      throw new Error(archiveError?.message || 'Failed to create archive')
    }

    // ── 4. Store hashed credentials ───────────────────────────────────────────
    const { error: credError } = await supabaseAdmin
      .from('archive_credentials')
      .insert({
        archive_id:    archive.id,
        password_hash: passwordHash,
        created_by:    archivistId,
        is_active:     true,
      })

    console.log('[onboard-client] Credential insert error:', credError?.message || 'none')
    if (credError) throw new Error('Failed to store credentials: ' + credError.message)

    // ── 5. Record commission (best-effort) ────────────────────────────────────
    await supabaseAdmin
      .from('commissions')
      .insert({
        archivist_id:    archivistId,
        commission_type: 'founding_fee',
        amount:          1000,
        status:          'pending',
        notes:           `${familyName} Archive — ${tier} tier founding`,
      })
      .then(() => {})

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

    await resend.emails.send({
      from:    `The ${familyName} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      clientEmail,
      subject: `Welcome to Basalith — The ${familyName} Archive is ready`,
      html:    buildWelcomeEmail(familyName, firstName, password, tierName, archivist.name),
    })

    // ── 9. Notify legacy@basalith.xyz ─────────────────────────────────────────
    await resend.emails.send({
      from:    'Basalith <davidha@basalith.xyz>',
      to:      process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz',
      subject: `New Archive — The ${familyName} Archive (${tier}) — via ${archivist.name}`,
      html: `<p><strong>New archive initialized</strong></p>
        <p>Family: The ${familyName} Archive</p>
        <p>Client: ${clientName} (${clientEmail})</p>
        <p>Tier: ${tierName}</p>
        <p>Archivist: ${archivist.name}</p>
        <p>Archive ID: ${archive.id}</p>
        <p>Commission recorded: $1,000 pending</p>`,
    })

    return NextResponse.json({
      success:     true,
      archiveId:   archive.id,
      archiveName: `The ${familyName} Archive`,
      clientEmail,
      password,
      message:     `The ${familyName} Archive has been initialized. Login credentials sent to ${clientEmail}.`,
    })

  } catch (error: any) {
    console.error('[onboard-client]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
