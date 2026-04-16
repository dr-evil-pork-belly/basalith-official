import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contributors')
    .select('id, name, email, role, status, photos_labelled, created_at')
    .eq('archive_id', archiveId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contributors: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { archiveId, name, email, role } = await req.json()
    if (!archiveId || !email) {
      return NextResponse.json({ error: 'archiveId and email required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('contributors')
      .upsert(
        { archive_id: archiveId, email: email.trim(), name: name?.trim() ?? null, role: role ?? null, status: 'active' },
        { onConflict: 'archive_id,email' },
      )
      .select('id, name, email, role, status, photos_labelled, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send welcome email to the contributor (best-effort, non-blocking)
    try {
      const { data: archive } = await supabaseAdmin
        .from('archives')
        .select('name, family_name')
        .eq('id', archiveId)
        .single()

      if (archive && data?.email) {
        const firstName     = data.name?.split(' ')[0] || 'there'
        const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
        const fromEmail     = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'

        await resend.emails.send({
          from:    `The ${archive.family_name} Archive <${fromEmail}>`,
          to:      data.email,
          subject: `You have been added to The ${archive.family_name} Archive`,
          html:    buildContributorWelcomeEmail(firstName, archive.name, archive.family_name, siteUrl),
        })
      }
    } catch (emailErr: unknown) {
      console.error('[contributors] Welcome email failed:', emailErr instanceof Error ? emailErr.message : emailErr)
    }

    return NextResponse.json({ contributor: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildContributorWelcomeEmail(
  firstName:   string,
  archiveName: string,
  familyName:  string,
  siteUrl:     string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:560px;margin:0 auto;padding:0">

  <div style="padding:40px 40px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0">
      THE ${familyName.toUpperCase()} ARCHIVE
    </p>
  </div>

  <div style="padding:32px 40px 40px">

    <p style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EDE6;margin:0 0 20px">
      ${firstName},
    </p>

    <div style="border-left:2px solid rgba(196,162,74,0.4);padding:0 0 0 24px;margin:0 0 32px">
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.9;font-style:italic;margin:0">
        You have been added to ${archiveName} as a contributor.
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.8;margin:0 0 16px">
      This archive is a permanent record of the ${familyName} family. As a contributor,
      you will receive photographs from the archive by email. When you do, simply reply
      with whatever you remember.
    </p>

    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.8;margin:0 0 32px">
      No account is required. Your memories are added to the archive automatically.
      Every detail you share is preserved here permanently.
    </p>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:24px">
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#3A3830;margin:0 0 16px">
        Your first photograph will arrive soon.
      </p>
      <a href="${siteUrl}" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;text-decoration:none">
        BASALITH · XYZ
      </a>
    </div>

  </div>

</body>
</html>`
}

export async function DELETE(req: NextRequest) {
  try {
    const { archiveId, contributorId } = await req.json()
    if (!archiveId || !contributorId) {
      return NextResponse.json({ error: 'archiveId and contributorId required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('contributors')
      .update({ status: 'inactive' })
      .eq('id', contributorId)
      .eq('archive_id', archiveId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
