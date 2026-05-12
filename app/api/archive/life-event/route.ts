import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { NextResponse } from 'next/server'
import { getEmailPhotoUrl } from '@/lib/photo-url'

const anthropic = new Anthropic()

// ── POST — trigger a life event send ──────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { archiveId, dateId, force } = await req.json()

    if (!archiveId || !dateId) {
      return NextResponse.json({ error: 'archiveId and dateId required' }, { status: 400 })
    }

    const triggerYear = new Date().getFullYear().toString()

    // Idempotency — don't send twice for the same date in the same year
    if (!force) {
      const { data: existing } = await supabaseAdmin
        .from('owner_notifications')
        .select('id')
        .eq('archive_id', archiveId)
        .eq('type', 'life_event')
        .filter('metadata->>dateId', 'eq', dateId)
        .filter('metadata->>triggerYear', 'eq', triggerYear)
        .single()

      if (existing) {
        return NextResponse.json({ skipped: true, reason: 'Already sent this year' })
      }
    }

    // Fetch archive + significant date
    const [{ data: archive }, { data: dateRow }] = await Promise.all([
      supabaseAdmin.from('archives').select('*').eq('id', archiveId).single(),
      supabaseAdmin.from('significant_dates').select('*').eq('id', dateId).single(),
    ])

    if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
    if (!dateRow) return NextResponse.json({ error: 'Date not found' }, { status: 404 })

    // Fetch contributors + owner
    const { data: contributors } = await supabaseAdmin
      .from('contributors')
      .select('email, name')
      .eq('archive_id', archiveId)
      .eq('status', 'active')

    const recipients: { email: string; name: string }[] = [
      { email: archive.owner_email, name: archive.owner_name || 'there' },
      ...(contributors ?? []),
    ]

    // Pick a curated photograph — prefer one from the era if year is set
    let photoQuery = supabaseAdmin
      .from('photographs')
      .select('id, storage_path, ai_era_estimate, ai_category, primary_label')
      .eq('archive_id', archiveId)
      .eq('status', 'labelled')
      .eq('is_best_in_cluster', true)
      .order('priority_score', { ascending: false })
      .limit(20)

    const { data: candidatePhotos } = await photoQuery
    const photos = candidatePhotos ?? []

    // Try to find a photo from the right era
    let chosenPhoto = photos[0] ?? null
    if (dateRow.year && photos.length > 1) {
      const targetDecade = Math.floor(dateRow.year / 10) * 10
      const eraMatch = photos.find(p => {
        if (!p.ai_era_estimate) return false
        const match = p.ai_era_estimate.match(/\d{4}/)
        if (!match) return false
        return Math.abs(parseInt(match[0]) - targetDecade) <= 20
      })
      if (eraMatch) chosenPhoto = eraMatch
    }

    // Permanent proxy URL — never expires, works for the life of the email
    const photoUrl: string | null = chosenPhoto?.id ? getEmailPhotoUrl(chosenPhoto.id) : null

    // Build context for AI reflection
    const { data: recentDeposits } = await supabaseAdmin
      .from('owner_deposits')
      .select('response')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(10)

    const depositContext = (recentDeposits ?? [])
      .map(d => d.response)
      .filter(Boolean)
      .slice(0, 5)
      .join('\n\n')

    // Generate AI reflection using Claude Sonnet
    const yearsAgo = dateRow.year ? (new Date().getFullYear() - dateRow.year) : null
    const yearsAgoStr = yearsAgo ? ` (${yearsAgo} years ago)` : ''

    let reflection = ''
    try {
      const aiRes = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 180,
        system: `You are helping write a short, human reflection for a family archive email.
The archive is "${archive.name}" and belongs to ${archive.owner_name || 'the family'}.
Write 2-3 sentences. Be warm, specific where possible, never generic or AI-sounding.
Do not use the phrase "cherish" or "treasure". Speak directly to the reader.
Context from the archive owner's own words: ${depositContext || 'No context available.'}`,
        messages: [{
          role: 'user',
          content: `Today is ${dateRow.person_name}${yearsAgoStr}. Event type: ${dateRow.date_type}. Write a short reflection for the family archive email.${dateRow.notes ? ` Note: ${dateRow.notes}` : ''}`,
        }],
      })
      reflection = aiRes.content[0].type === 'text' ? aiRes.content[0].text.trim() : ''
    } catch {
      // Non-fatal — send without reflection
    }

    // Subject line
    const subjectMap: Record<string, string> = {
      birthday:             `Today is ${dateRow.person_name}'s birthday`,
      death_anniversary:    `Remembering ${dateRow.person_name}`,
      wedding_anniversary:  `Today is ${dateRow.person_name}'s anniversary`,
      other:                `A day to remember · ${dateRow.person_name}`,
    }
    const subject = subjectMap[dateRow.date_type] ?? `${dateRow.person_name} · ${archive.name}`

    const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const archiveName = archive.name || 'The Family Archive'

    const yearsBlock = yearsAgo ? `
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0 0 20px;text-transform:uppercase">
    ${yearsAgo} years
  </p>` : ''

    const reflectionBlock = reflection ? `
  <p style="font-family:Georgia,serif;font-size:16px;color:#9DA3A8;line-height:1.8;margin:0 0 24px">
    ${reflection}
  </p>` : ''

    const photoBlock = photoUrl ? `
  <div style="margin:24px 0">
    <img src="${photoUrl}" alt="${archiveName}" style="width:100%;max-width:540px;display:block;border-radius:2px;filter:sepia(0.08)" />
    ${chosenPhoto?.primary_label ? `<p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:2px;color:#5C6166;margin:8px 0 0;text-transform:uppercase">${chosenPhoto.primary_label}</p>` : ''}
  </div>` : ''

    const html = `<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:40px 32px 0;text-align:center">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style="margin:0 auto 16px;display:block">
      <rect x="5" y="5" width="26" height="26" stroke="rgba(196,162,74,0.9)" stroke-width="1.2" transform="rotate(45 18 18)"/>
      <rect x="9" y="9" width="18" height="18" stroke="rgba(196,162,74,0.45)" stroke-width="0.8" transform="rotate(45 18 18)"/>
    </svg>
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0">
      ${archiveName.toUpperCase()}
    </p>
  </div>

  <div style="padding:32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#5C6166;text-transform:uppercase;margin:0 0 12px">
      ${dateRow.date_type.replace(/_/g, ' ').toUpperCase()}
    </p>
    <p style="font-size:24px;font-style:italic;color:#F0EDE6;line-height:1.3;margin:0 0 6px">
      ${dateRow.person_name}
    </p>
    ${yearsBlock}
    ${reflectionBlock}
    ${photoBlock}
    <div style="margin-top:28px">
      <a href="${baseUrl}/archive/gallery" style="display:inline-block;background:rgba(196,162,74,1);color:#0A0A0B;font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:2px">
        OPEN THE ARCHIVE →
      </a>
    </div>
  </div>

  <div style="padding:24px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
      BASALITH &middot; XYZ<br>
      ${archiveName} &middot; Generation I
    </p>
  </div>

</body>`

    // Send to all recipients
    let sentCount = 0
    for (const recipient of recipients) {
      try {
        await resend.emails.send({
          from:    `${archiveName} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      recipient.email,
          subject,
          html,
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
            'X-Entity-Ref-ID':  `basalith-${archiveId}-${Date.now()}`,
            'Precedence':       'bulk',
          },
        })
        sentCount++
      } catch (err: any) {
        console.warn(`life-event send failed for ${recipient.email}:`, err.message)
      }
    }

    // Log — idempotency record
    supabaseAdmin.from('owner_notifications').insert({
      archive_id: archiveId,
      type:       'life_event',
      subject,
      sent_to:    recipients.map(r => r.email).join(', '),
      sent_at:    new Date().toISOString(),
      metadata:   { dateId, triggerYear, personName: dateRow.person_name, dateType: dateRow.date_type, sentCount },
    }).then(() => {})

    return NextResponse.json({ success: true, sentCount, subject })
  } catch (err: any) {
    console.error('life-event POST:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
