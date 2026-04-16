import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import {
  generateContributorToken,
  generateQuestionsForContributor,
} from '@/lib/contributorToken'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contributors')
    .select('id, name, email, role, status, photos_labelled, created_at, access_token, relationship')
    .eq('archive_id', archiveId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contributors: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { archiveId, name, email, role, relationship } = await req.json()
    if (!archiveId || !email) {
      return NextResponse.json({ error: 'archiveId and email required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('contributors')
      .upsert(
        {
          archive_id:   archiveId,
          email:        email.trim(),
          name:         name?.trim()     ?? null,
          role:         role             ?? null,
          relationship: relationship     ?? 'other',
          status:       'active',
        },
        { onConflict: 'archive_id,email' },
      )
      .select('id, name, email, role, status, photos_labelled, created_at, access_token, relationship')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Generate or refresh access token (best-effort)
    let portalToken: string | null = null
    try {
      portalToken = await generateContributorToken(data.id)
    } catch (tokenErr: unknown) {
      console.error('[contributors] Token generation failed:', tokenErr instanceof Error ? tokenErr.message : tokenErr)
    }

    // Generate initial questions for the contributor (best-effort)
    try {
      await generateQuestionsForContributor(
        data.id,
        archiveId,
        relationship ?? 'other',
      )
    } catch (qErr: unknown) {
      console.error('[contributors] Question generation failed:', qErr instanceof Error ? qErr.message : qErr)
    }

    // Send invitation email with portal link (best-effort)
    try {
      const { data: archive } = await supabaseAdmin
        .from('archives')
        .select('name, family_name, owner_name')
        .eq('id', archiveId)
        .single()

      if (archive && data?.email) {
        const firstName = data.name?.split(' ')[0] || 'there'
        const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
        const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
        const portalUrl = portalToken ? `${siteUrl}/contribute/${portalToken}` : null

        await resend.emails.send({
          from:    `The ${archive.family_name} Archive <${fromEmail}>`,
          to:      data.email,
          subject: `You have been invited to The ${archive.family_name} Archive`,
          html:    buildContributorInviteEmail({
            firstName,
            archiveName: archive.name,
            familyName:  archive.family_name,
            ownerName:   archive.owner_name ?? '',
            portalUrl,
            siteUrl,
          }),
        })
      }
    } catch (emailErr: unknown) {
      console.error('[contributors] Invite email failed:', emailErr instanceof Error ? emailErr.message : emailErr)
    }

    return NextResponse.json({ contributor: { ...data, access_token: portalToken ?? data.access_token } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { action, archiveId, contributorId } = await req.json()
    if (action !== 'resend-invite' || !archiveId || !contributorId) {
      return NextResponse.json({ error: 'action, archiveId, and contributorId required' }, { status: 400 })
    }

    const { data: contributor } = await supabaseAdmin
      .from('contributors')
      .select('id, name, email, access_token')
      .eq('id', contributorId)
      .eq('archive_id', archiveId)
      .single()

    if (!contributor) return NextResponse.json({ error: 'Contributor not found' }, { status: 404 })

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('name, family_name, owner_name')
      .eq('id', archiveId)
      .single()

    if (!archive || !contributor.email) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
    }

    const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
    const firstName = contributor.name?.split(' ')[0] || 'there'
    const portalUrl = contributor.access_token ? `${siteUrl}/contribute/${contributor.access_token}` : null

    await resend.emails.send({
      from:    `The ${archive.family_name} Archive <${fromEmail}>`,
      to:      contributor.email,
      subject: `Your contributor portal link — The ${archive.family_name} Archive`,
      html:    buildContributorInviteEmail({
        firstName,
        archiveName: archive.name,
        familyName:  archive.family_name,
        ownerName:   archive.owner_name ?? '',
        portalUrl,
        siteUrl,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contributorId = searchParams.get('id')
    const archiveId     = searchParams.get('archiveId')

    if (!contributorId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const query = supabaseAdmin
      .from('contributors')
      .update({ status: 'inactive' })
      .eq('id', contributorId)

    if (archiveId) query.eq('archive_id', archiveId)

    const { error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildContributorInviteEmail({
  firstName,
  archiveName,
  familyName,
  ownerName,
  portalUrl,
  siteUrl,
}: {
  firstName:   string
  archiveName: string
  familyName:  string
  ownerName:   string
  portalUrl:   string | null
  siteUrl:     string
}): string {
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

    <div style="border-left:2px solid rgba(196,162,74,0.4);padding:0 0 0 24px;margin:0 0 28px">
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.9;font-style:italic;margin:0">
        You have been invited to contribute to ${archiveName}${ownerName ? ` — ${ownerName}'s archive` : ''}.
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.8;margin:0 0 28px">
      This archive is a permanent record of the ${familyName} family. As a contributor,
      you will receive photographs from the archive by email, and you can share your
      own photographs, videos, and memories through your personal portal.
    </p>

    ${portalUrl ? `
    <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin:0 0 28px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 12px">
        YOUR CONTRIBUTOR PORTAL
      </p>
      <a href="${portalUrl}" style="font-family:Georgia,serif;font-size:14px;color:#C4A24A;word-break:break-all">
        ${portalUrl}
      </a>
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#706C65;margin:12px 0 0;line-height:1.7">
        Bookmark this link. It is your personal access to the archive.
        No password needed.
      </p>
    </div>

    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;margin:0 0 8px">
      THROUGH YOUR PORTAL YOU CAN:
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#9DA3A8;line-height:2;margin:0 0 28px">
      Upload photographs from your own collection<br>
      Upload videos and documents<br>
      Record voice memories<br>
      Answer questions about ${ownerName || 'the archive subject'}
    </p>
    ` : ''}

    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.8;margin:0 0 28px">
      Tonight you will receive your first photograph by email.
      Simply reply with whatever you remember — your memories go directly into the archive.
    </p>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:24px">
      <a href="${siteUrl}" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;text-decoration:none">
        BASALITH · XYZ
      </a>
    </div>

  </div>

</body>
</html>`
}
