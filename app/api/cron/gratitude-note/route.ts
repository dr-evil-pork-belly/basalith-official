import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam = searchParams.get('secret') || ''
  const authHeader = req.headers.get('authorization') || ''
  const headerSecret = authHeader.replace('Bearer ', '')
  const expectedSecret = process.env.CRON_SECRET || ''

  const isAuthorized = expectedSecret && (
    headerSecret === expectedSecret ||
    secretParam === expectedSecret
  )

  if (!isAuthorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isTest = new URL(req.url).searchParams.get('test') === 'true'

  if (!isTest && new Date().getDate() !== 2) {
    return Response.json({ skipped: true, reason: 'Not 2nd of month' })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name')
    .eq('status', 'active')

  let sent = 0

  for (const archive of archives ?? []) {
    try {
      // Get all labels this month with their text
      const { data: labelActivity } = await supabaseAdmin
        .from('labels')
        .select('labelled_by, what_was_happening, legacy_note')
        .eq('archive_id', archive.id)
        .gte('created_at', cutoff)
        .not('labelled_by', 'is', null)

      if (!labelActivity || labelActivity.length === 0) continue

      // Tally contributions per contributor
      const counts: Record<string, { count: number; memories: string[] }> = {}
      for (const l of labelActivity) {
        if (!l.labelled_by) continue
        if (!counts[l.labelled_by]) counts[l.labelled_by] = { count: 0, memories: [] }
        counts[l.labelled_by].count++
        if (l.what_was_happening && counts[l.labelled_by].memories.length < 3) {
          counts[l.labelled_by].memories.push(l.what_was_happening)
        }
      }

      const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count)
      if (sorted.length === 0) continue

      const [contributorName, data] = sorted[0]

      // Look up their email — match on first name prefix to handle display name variants
      const firstName = contributorName.split(' ')[0]
      const { data: contributor } = await supabaseAdmin
        .from('contributors')
        .select('email, name')
        .eq('archive_id', archive.id)
        .ilike('name', `${firstName}%`)
        .limit(1)
        .maybeSingle()

      if (!contributor?.email) continue

      // Ask Claude to write a personal note from the archive
      const memorySample = data.memories.slice(0, 2).join(' · ')

      let noteText: string
      try {
        const aiResponse = await anthropic.messages.create({
          model:      'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [{
            role:    'user',
            content: `Write a short, personal, deeply sincere thank-you note from a family archive to a contributor named ${contributorName}.

They contributed ${data.count} memories this month to The ${archive.family_name} Archive.

Some of what they shared: "${memorySample}"

The note should:
- Address them by first name only
- Reference something specific from what they shared
- Express genuine gratitude for what their memories preserve
- Be 3-4 sentences maximum
- Feel personal not corporate
- End with "— The ${archive.family_name} Archive"
- Never use the words "amazing", "wonderful", or "incredible"
- Sound like a quiet human moment not a marketing email

Return only the note text. Nothing else.`,
          }],
        })
        noteText = aiResponse.content[0].type === 'text'
          ? aiResponse.content[0].text.trim()
          : fallbackNote(firstName, data.count, archive.family_name)
      } catch {
        noteText = fallbackNote(firstName, data.count, archive.family_name)
      }

      await resend.emails.send({
        from:    `The ${archive.family_name} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      contributor.email,
        subject: `A note from The ${archive.family_name} Archive`,
        html:    buildGratitudeEmail(archive.family_name, firstName, data.count, noteText),
      })

      sent++
      console.log(`[gratitude-note] Sent to: ${contributor.email}`)
    } catch (err: any) {
      console.error(`[gratitude-note] Failed for archive ${archive.id}:`, err.message)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, isTest })
}

function fallbackNote(firstName: string, count: number, familyName: string): string {
  return `${firstName} — you contributed ${count} memories to The ${familyName} Archive this month. Because of you, things exist in this archive that would not exist anywhere else. That matters more than you know.\n— The ${familyName} Archive`
}

function buildGratitudeEmail(
  familyName:        string,
  firstName:         string,
  contributionCount: number,
  noteText:          string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:520px;margin:0 auto;padding:0">

  <div style="padding:40px 40px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0">
      THE ${familyName.toUpperCase()} ARCHIVE
    </p>
  </div>

  <div style="padding:40px">

    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:rgba(196,162,74,0.5);margin:0 0 32px">
      ${contributionCount} ${contributionCount === 1 ? 'MEMORY' : 'MEMORIES'} THIS MONTH
    </p>

    <div style="border-left:2px solid rgba(196,162,74,0.4);padding:0 0 0 24px;margin:0 0 40px">
      <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;line-height:1.9;font-style:italic;margin:0;white-space:pre-line">
        ${noteText}
      </p>
    </div>

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:24px">
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#3A3830;margin:0 0 16px">
        Your memories are preserved in this archive permanently.
      </p>
      <a href="${siteUrl}" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;text-decoration:none">
        BASALITH · XYZ
      </a>
    </div>

  </div>

</body>
</html>`
}
