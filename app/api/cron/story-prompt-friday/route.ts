import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { getEmailPhotoUrl } from '@/lib/photo-url'

export const dynamic = 'force-dynamic'

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

  if (!isTest && new Date().getDay() !== 5) {
    return Response.json({ skipped: true, reason: 'Not Friday' })
  }

  // All unrevealed sessions from the past 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: sessions } = await supabaseAdmin
    .from('story_prompt_sessions')
    .select('*')
    .eq('reveal_sent', false)
    .gte('sent_at', sevenDaysAgo.toISOString())

  let sent = 0

  for (const session of sessions ?? []) {
    try {
      // Fetch photo, archive, contributors in parallel
      const [
        { data: photo },
        { data: archive },
        { data: contributors },
        { data: labels },
        { data: emailReplies },
      ] = await Promise.all([
        supabaseAdmin
          .from('photographs')
          .select('id, storage_path, ai_era_estimate')
          .eq('id', session.photograph_id)
          .single(),
        supabaseAdmin
          .from('archives')
          .select('name, family_name')
          .eq('id', session.archive_id)
          .single(),
        supabaseAdmin
          .from('contributors')
          .select('email, name')
          .eq('archive_id', session.archive_id)
          .eq('status', 'active'),
        supabaseAdmin
          .from('labels')
          .select('labelled_by, what_was_happening')
          .eq('archive_id', session.archive_id)
          .eq('photograph_id', session.photograph_id)
          .gte('created_at', session.sent_at),
        supabaseAdmin
          .from('email_replies')
          .select('contributor_name, reply_text, created_at')
          .eq('archive_id', session.archive_id)
          .gte('created_at', session.sent_at)
          .order('created_at', { ascending: true })
          .limit(10),
      ])

      if (!photo || !archive) continue

      const photoUrl = getEmailPhotoUrl(photo.id)

      // Merge email replies and label contributions
      const responses: Array<{ name: string; text: string }> = [
        ...(emailReplies ?? [])
          .filter(r => r.reply_text)
          .map(r => ({ name: r.contributor_name ?? 'A family member', text: r.reply_text })),
        ...(labels ?? [])
          .filter(l => l.what_was_happening)
          .map(l => ({ name: l.labelled_by ?? 'A family member', text: l.what_was_happening! })),
      ]

      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

      // Send reveal to all contributors
      for (const contributor of contributors ?? []) {
        try {
          await resend.emails.send({
            from:    `The ${archive.family_name} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      contributor.email,
            subject: `Friday reveal — here is what the family knows · ${archive.name}`,
            html:    buildFridayEmail(archive.family_name, photoUrl, photo.ai_era_estimate, responses, dateStr),
            headers: {
              'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
              'X-Entity-Ref-ID':  `basalith-${session.archive_id}-${Date.now()}`,
              'Precedence':       'bulk',
            },
          })
        } catch (emailErr: any) {
          console.error(`[story-prompt-friday] Email failed for ${contributor.email}:`, emailErr.message)
        }
      }

      // Mark session as revealed
      await supabaseAdmin
        .from('story_prompt_sessions')
        .update({ reveal_sent: true })
        .eq('id', session.id)

      console.log(`[story-prompt-friday] Revealed session ${session.id} — ${responses.length} responses`)
      sent++
    } catch (err: any) {
      console.error(`[story-prompt-friday] Failed for session ${session.id}:`, err.message)
    }
  }

  return Response.json({ sent, total: sessions?.length ?? 0, isTest })
}

function buildFridayEmail(
  familyName:  string,
  photoUrl:    string,
  eraEstimate: string | null,
  responses:   Array<{ name: string; text: string }>,
  dateStr:     string,
): string {
  const hasResponses = responses.length > 0

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      THE ${familyName.toUpperCase()} ARCHIVE
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">
      FRIDAY REVEAL · ${dateStr}
    </p>
  </div>

  <div style="padding:24px 32px 0">
    <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#F0EDE6;margin:0 0 8px">
      ${hasResponses ? 'Here is what the family knows.' : 'This photograph is still a mystery.'}
    </h2>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;margin:0 0 16px">
      ${hasResponses
        ? `${responses.length} ${responses.length === 1 ? 'memory' : 'memories'} contributed this week.`
        : 'Nobody has labeled this photograph yet. Do you know what was happening?'}
    </p>
  </div>

  ${photoUrl ? `
  <div style="margin:0">
    <img src="${photoUrl}" width="600" style="display:block;width:100%;max-width:600px;height:auto" alt="This week's photograph">
  </div>` : ''}

  <div style="padding:32px">

    ${hasResponses ? `
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 20px">
      WHAT YOUR FAMILY REMEMBERED
    </p>

    ${responses.map(r => `
    <div style="border-left:2px solid rgba(196,162,74,0.3);padding:12px 20px;margin-bottom:16px">
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.8;font-style:italic;margin:0 0 8px">
        &ldquo;${r.text.length > 300 ? r.text.substring(0, 300) + '&hellip;' : r.text}&rdquo;
      </p>
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0">
        — ${r.name}
      </p>
    </div>`).join('')}

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;margin-top:24px">
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 8px">
        ${eraEstimate ? `Our AI estimates this photograph is from ${eraEstimate}.` : 'This photograph has been added to your archive.'}
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#5C6166;margin:0">
        These memories are now permanently preserved in The ${familyName} Archive.
      </p>
    </div>
    ` : `
    <div style="border-left:3px solid rgba(196,162,74,0.3);padding:16px 20px;margin-bottom:24px">
      <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#B8B4AB;line-height:1.7;margin:0">
        Do you recognize anything in this photograph? Reply to this email with what you know. Even a partial memory helps.
      </p>
    </div>
    `}

  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:20px 0 0">
      BASALITH · XYZ<br>
      The ${familyName} Archive<br>
      New mystery every Monday.
    </p>
  </div>

</body>
</html>`
}
