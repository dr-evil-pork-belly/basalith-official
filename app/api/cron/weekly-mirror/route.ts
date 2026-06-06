import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { generateMirror } from '@/lib/generateMirror'
import { createEmailReplySession, buildReplyAddress } from '@/lib/emailReplySessions'

export const dynamic = 'force-dynamic'

type Deposit = { id: string; prompt: string; response: string; created_at: string }

// Sunday of the current week, in UTC, as a YYYY-MM-DD date string. On the
// Sunday 17:00 UTC schedule this is the run date itself.
function startOfWeekUTC(d: Date): string {
  const sunday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay()))
  return sunday.toISOString().slice(0, 10)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam    = searchParams.get('secret') || ''
  const headerSecret   = (req.headers.get('authorization') || '').replace('Bearer ', '')
  const expectedSecret = process.env.CRON_SECRET || ''

  const isAuthorized = expectedSecret && (headerSecret === expectedSecret || secretParam === expectedSecret)
  if (!isAuthorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now          = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekOf       = startOfWeekUTC(now)

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_email')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  let sent    = 0
  let skipped = 0

  for (const archive of archives ?? []) {
    try {
      // ── 1. This week's deposits ──────────────────────────────────────────────
      const { data: depositRows } = await supabaseAdmin
        .from('owner_deposits')
        .select('id, prompt, response, created_at')
        .eq('archive_id', archive.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      const deposits = (depositRows ?? []) as Deposit[]

      // ── 2. Not enough to reflect on ──────────────────────────────────────────
      if (deposits.length < 2) {
        skipped++
        continue
      }

      // ── 3. Generate the mirror (throws on failure → caught below, skips) ──────
      const { reflection, threadQuestion } = await generateMirror(archive.id, archive.name, deposits)

      // ── 4. Record it ─────────────────────────────────────────────────────────
      const { error: insertError } = await supabaseAdmin
        .from('mirror_reflections')
        .insert({
          archive_id:      archive.id,
          reflection,
          thread_question: threadQuestion,
          deposit_ids:     deposits.map(d => d.id),
          week_of:         weekOf,
        })

      if (insertError) {
        // Do not send an unrecorded mirror. Loud failure also signals if the
        // mirror_reflections migration has not been applied yet.
        console.error(`[weekly-mirror] insert failed for archive ${archive.id}:`, insertError.message)
        continue
      }

      // ── 5. Reply token so the owner can answer the thread ────────────────────
      let replyTo: string | undefined
      try {
        const token = await createEmailReplySession({
          archiveId:     archive.id,
          contributorId: null,
          emailType:     'mirror',
          sparkId:       threadQuestion.substring(0, 200),
        })
        replyTo = buildReplyAddress(token)
      } catch (e) {
        console.warn('[weekly-mirror] reply session failed:', e instanceof Error ? e.message : e)
      }

      // ── 6. Send ──────────────────────────────────────────────────────────────
      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        replyTo,
        subject: `What I am learning about you · ${archive.name}`,
        text:    buildMirrorText(reflection, threadQuestion),
        html:    buildMirrorEmail(archive.name, reflection, threadQuestion),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-${archive.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      })

      // ── 7. Log ───────────────────────────────────────────────────────────────
      console.log('[weekly-mirror] sent to:', archive.owner_email, 'deposits:', deposits.length)
      sent++
    } catch (err: unknown) {
      console.error(`[weekly-mirror] Failed for archive ${archive.id}:`, err instanceof Error ? err.message : err)
    }
  }

  return Response.json({ sent, skipped, total: archives?.length ?? 0, weekOf })
}

// ── Email builders ────────────────────────────────────────────────────────────

function buildMirrorText(reflection: string, threadQuestion: string): string {
  return `${reflection}

If you want to keep going:
${threadQuestion}

Just reply to this email.

BASALITH
Heritage Nexus Inc.`
}

function buildMirrorEmail(archiveName: string, reflection: string, threadQuestion: string): string {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:40px 36px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      ${escapeHtml(archiveName.toUpperCase())}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">
      WHAT I AM LEARNING ABOUT YOU · ${dateStr.toUpperCase()}
    </p>
  </div>

  <div style="padding:36px">

    <div style="font-family:Georgia,serif;font-size:19px;font-weight:300;font-style:italic;color:#F0EDE6;line-height:2.0;margin:0 0 40px;white-space:pre-wrap">${escapeHtml(reflection)}</div>

    <div style="height:1px;background:rgba(196,162,74,0.25);margin:0 0 32px"></div>

    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;margin:0 0 16px">
      If you want to keep going:
    </p>

    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:18px 24px;margin:0 0 28px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:19px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0">
        ${escapeHtml(threadQuestion)}
      </p>
    </div>

    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;margin:0">
      Just reply to this email.
    </p>

  </div>

  <div style="padding:0 36px 36px">
    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;margin-top:8px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
        BASALITH · XYZ<br>${escapeHtml(archiveName)}<br>Heritage Nexus Inc.
      </p>
    </div>
  </div>

</body>
</html>`
}
