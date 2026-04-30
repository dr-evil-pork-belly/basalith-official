import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { calculateEntityReadiness } from '@/lib/entityReadiness'

// ── Invitation email ──────────────────────────────────────────────────────────

function buildInvitationEmail(
  ownerName:       string,
  archiveName:     string,
  contributorName: string,
  portalUrl:       string,
): string {
  const first = ownerName.split(' ')[0]
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 24px">
    ${archiveName.toUpperCase()}
  </p>
  <h1 style="font-size:24px;font-weight:300;color:#F0EDE6;margin:0 0 20px;line-height:1.3">
    ${first} has invited you to talk to their entity.
  </h1>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
    ${ownerName} has reached a milestone.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
    Their entity has learned enough to meet the people who know them best.
  </p>
  <p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
    You have been invited to talk to it.
    This is early. Your feedback will help make it more accurate.
  </p>
  <p style="font-size:15px;font-style:italic;font-weight:300;color:#9DA3A8;line-height:1.8;margin:0 0 32px">
    Ask it anything you would have asked ${first}.
  </p>
  <a href="${portalUrl}"
    style="display:inline-block;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#0A0908;background:#C4A24A;text-decoration:none;padding:14px 32px">
    Talk to the Entity →
  </a>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:32px 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0">
    BASALITH · XYZ<br>Heritage Nexus Inc.
  </p>
</body>
</html>`
}

// ── GET — readiness + current access state ────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  try {
    const [readiness, archiveRow, contributors] = await Promise.all([
      calculateEntityReadiness(archiveId),

      supabaseAdmin
        .from('archives')
        .select('contributor_entity_access, entity_preview_contributor_ids, owner_name')
        .eq('id', archiveId)
        .single(),

      supabaseAdmin
        .from('contributors')
        .select('id, name, email')
        .eq('archive_id', archiveId)
        .eq('status', 'active'),
    ])

    if (archiveRow.error) throw archiveRow.error

    const archive = archiveRow.data

    // Persist readiness score
    await supabaseAdmin
      .from('archives')
      .update({ entity_readiness_score: readiness.score })
      .eq('id', archiveId)
      .then(() => {})

    return NextResponse.json({
      ...readiness,
      access:                 archive.contributor_entity_access ?? 'none',
      previewContributorIds:  archive.entity_preview_contributor_ids ?? [],
      ownerName:              archive.owner_name ?? '',
      contributors:           contributors.data ?? [],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST — change access level ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, contributorIds } = body as {
    action:          'enable_preview' | 'enable_open' | 'disable'
    contributorIds?: string[]
  }

  try {
    if (action === 'enable_preview') {
      if (!contributorIds?.length) {
        return NextResponse.json({ error: 'contributorIds required for preview' }, { status: 400 })
      }

      await supabaseAdmin
        .from('archives')
        .update({
          contributor_entity_access:      'preview',
          entity_access_enabled_at:       new Date().toISOString(),
          entity_preview_contributor_ids: contributorIds,
        })
        .eq('id', archiveId)

      // Fetch details for invitation emails
      const { data: archiveRow } = await supabaseAdmin
        .from('archives')
        .select('name, owner_name')
        .eq('id', archiveId)
        .single()

      const { data: invitedContribs } = await supabaseAdmin
        .from('contributors')
        .select('id, name, email, access_token')
        .eq('archive_id', archiveId)
        .in('id', contributorIds)

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

      for (const c of invitedContribs ?? []) {
        const portalUrl = c.access_token
          ? `${siteUrl}/contribute/${c.access_token}`
          : `${siteUrl}/contribute`

        try {
          await resend.emails.send({
            from:    `${archiveRow?.name ?? 'Basalith'} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      c.email,
            subject: `${archiveRow?.owner_name ?? 'Your family member'} has invited you to talk to their entity`,
            headers: { 'X-Entity-Ref-ID': `basalith-entity-invite-${archiveId}-${c.id}` },
            html:    buildInvitationEmail(
              archiveRow?.owner_name ?? 'Your family member',
              archiveRow?.name       ?? 'The Archive',
              c.name,
              portalUrl,
            ),
          })
        } catch (e) {
          console.error('[entity-readiness] invite email failed:', e)
        }
      }

      return NextResponse.json({ ok: true, access: 'preview', invited: invitedContribs?.length ?? 0 })
    }

    if (action === 'enable_open') {
      await supabaseAdmin
        .from('archives')
        .update({
          contributor_entity_access: 'open',
          entity_access_enabled_at:  new Date().toISOString(),
        })
        .eq('id', archiveId)

      return NextResponse.json({ ok: true, access: 'open' })
    }

    if (action === 'disable') {
      await supabaseAdmin
        .from('archives')
        .update({
          contributor_entity_access:      'none',
          entity_preview_contributor_ids: [],
        })
        .eq('id', archiveId)

      return NextResponse.json({ ok: true, access: 'none' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
