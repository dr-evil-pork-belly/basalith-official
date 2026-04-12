import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isTest = new URL(req.url).searchParams.get('test') === 'true'

  if (!isTest && new Date().getDay() !== 1) {
    return Response.json({ skipped: true, reason: 'Not Monday' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name')
    .eq('status', 'active')

  let sent = 0

  for (const archive of archives ?? []) {
    try {
      // Need at least 2 active contributors for the game to be meaningful
      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('email, name')
        .eq('archive_id', archive.id)
        .eq('status', 'active')

      if (!contributors || contributors.length < 2) continue

      // Select highest-priority unlabelled photo not yet used in a story prompt
      const { data: photos } = await supabaseAdmin
        .from('photographs')
        .select('id, storage_path, ai_era_estimate, priority_score')
        .eq('archive_id', archive.id)
        .eq('status', 'unlabelled')
        .eq('ai_processed', true)
        .is('story_prompt_sent_at', null)
        .order('priority_score', { ascending: false })
        .limit(10)

      if (!photos || photos.length === 0) continue

      const selectedPhoto = photos[0]

      // 7-day signed URL — lasts through Friday reveal
      const { data: signed } = await supabaseAdmin
        .storage
        .from('photographs')
        .createSignedUrl(selectedPhoto.storage_path, 86400 * 7)

      if (!signed?.signedUrl) continue

      const photoUrl = signed.signedUrl

      // Mark photo as used and create session record
      await Promise.all([
        supabaseAdmin
          .from('photographs')
          .update({ story_prompt_sent_at: new Date().toISOString() })
          .eq('id', selectedPhoto.id),
        supabaseAdmin
          .from('story_prompt_sessions')
          .insert({
            archive_id:    archive.id,
            photograph_id: selectedPhoto.id,
            sent_at:       new Date().toISOString(),
            reveal_sent:   false,
            responses:     [],
          }),
      ])

      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()

      // Send to all contributors
      let emailsSent = 0
      for (const contributor of contributors) {
        try {
          await resend.emails.send({
            from:    `The ${archive.family_name} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      contributor.email,
            subject: `Monday mystery — what was happening here? · ${archive.name}`,
            html:    buildMondayEmail(archive.family_name, photoUrl, selectedPhoto.ai_era_estimate, dateStr),
          })
          emailsSent++
        } catch (emailErr: any) {
          console.error(`[story-prompt-monday] Email failed for ${contributor.email}:`, emailErr.message)
        }
      }

      console.log(`[story-prompt-monday] Archive ${archive.id}: sent to ${emailsSent}/${contributors.length} contributors`)
      sent++
    } catch (err: any) {
      console.error(`[story-prompt-monday] Failed for archive ${archive.id}:`, err.message)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, isTest })
}

function buildMondayEmail(
  familyName:  string,
  photoUrl:    string,
  eraEstimate: string | null,
  dateStr:     string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      THE ${familyName.toUpperCase()} ARCHIVE
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      MONDAY MYSTERY · ${dateStr}
    </p>
  </div>

  <div style="padding:24px 32px 0">
    <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#F0EDE6;margin:0 0 8px">
      We found this photograph.
    </h2>
    <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#706C65;margin:0 0 24px">
      Nobody has labeled it yet.${eraEstimate ? ` Our AI thinks it is from ${eraEstimate}.` : ''}
    </p>
  </div>

  <div style="margin:0">
    <img src="${photoUrl}" width="600" style="display:block;width:100%;max-width:600px;height:auto" alt="Monday mystery photograph">
  </div>

  <div style="padding:32px">
    <div style="border-left:3px solid rgba(196,162,74,0.4);padding:16px 20px;margin-bottom:24px">
      <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">
        What do you think was happening here? Who do you recognize? Where do you think this was taken?
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#B8B4AB;line-height:1.7;margin:0 0 24px">
      Reply to this email with whatever you remember — or your best guess. On Friday we will share everything the family contributed about this photograph.
    </p>

    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:rgba(196,162,74,0.5);margin:0">
      REVEAL ARRIVES FRIDAY · REPLY WITH WHAT YOU KNOW
    </p>
  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:20px 0 0">
      BASALITH · XYZ<br>
      The ${familyName} Archive
    </p>
  </div>

</body>
</html>`
}
