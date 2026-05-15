import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { getEmailPhotoUrl } from '@/lib/photo-url'
import { getNextStoryPrompt, getWeakestDimensions } from '@/lib/storyPrompts'
import { createEmailReplySession, buildReplyAddress } from '@/lib/emailReplySessions'

export const dynamic = 'force-dynamic'

// Threshold: if a contributor has fewer than this many unseen photos,
// send a text story prompt instead.
const MIN_UNSEEN_PHOTOS = 5
// Threshold: if archive has fewer total photos than this, go text-first.
const MIN_ARCHIVE_PHOTOS = 20

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam  = searchParams.get('secret') || ''
  const authHeader   = req.headers.get('authorization') || ''
  const headerSecret = authHeader.replace('Bearer ', '')
  const expected     = process.env.CRON_SECRET || ''
  const isTest       = searchParams.get('test') === 'true'
  const force        = searchParams.get('force') === 'true'

  if (!expected || (headerSecret !== expected && secretParam !== expected)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isTest && !force && new Date().getDay() !== 1) {
    return Response.json({ skipped: true, reason: 'Not Monday' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name')
    .eq('status', 'active')

  let photoBatches = 0
  let textBatches  = 0

  for (const archive of archives ?? []) {
    try {
      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('id, email, name, preferred_language, access_token')
        .eq('archive_id', archive.id)
        .eq('status', 'active')

      if (!contributors || contributors.length < 2) continue

      // Count total archive photos
      const { count: totalPhotos } = await supabaseAdmin
        .from('photographs')
        .select('id', { count: 'exact', head: true })
        .eq('archive_id', archive.id)

      const archiveIsPhotoLight = (totalPhotos ?? 0) < MIN_ARCHIVE_PHOTOS

      for (const contributor of contributors) {
        try {
          // Count unseen photos for this contributor
          const { data: sentRows } = await supabaseAdmin
            .from('contributor_photo_sends')
            .select('photograph_id')
            .eq('contributor_id', contributor.id)

          const sentIds      = (sentRows ?? []).map(r => r.photograph_id).filter(Boolean)
          const unseenCount  = Math.max(0, (totalPhotos ?? 0) - sentIds.length)
          const useTextPrompt = archiveIsPhotoLight || unseenCount < MIN_UNSEEN_PHOTOS

          if (!useTextPrompt) {
            // ── Photo-based story prompt (existing path) ─────────────────────
            // Skip here — let per-archive photo logic handle it below
            continue
          }

          // ── Text story prompt (new fallback path) ────────────────────────────
          const weakDimensions  = await getWeakestDimensions(archive.id)
          const ownerName       = archive.owner_name ?? archive.name
          const prompt          = await getNextStoryPrompt(
            contributor.id,
            archive.id,
            ownerName,
            weakDimensions,
          )

          if (!prompt) {
            console.log(`[story-prompt-monday] ${contributor.email} has answered all story prompts`)
            continue
          }

          // Record before sending (idempotent — unique index prevents double-insert)
          const { error: insertError } = await supabaseAdmin
            .from('contributor_story_prompts')
            .insert({
              archive_id:     archive.id,
              contributor_id: contributor.id,
              prompt_id:      prompt.promptId,
              prompt_text:    prompt.text,
              dimension:      prompt.dimension,
              sent_at:        new Date().toISOString(),
            })

          if (insertError && !insertError.message.includes('unique')) {
            console.error('[story-prompt-monday] insert failed:', insertError.message)
            continue
          }

          const lang      = contributor.preferred_language ?? 'en'
          const portalUrl = contributor.access_token
            ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'}/contribute/${contributor.access_token}`
            : process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

          // Create reply session so contributor can answer by email
          const replyToken = await createEmailReplySession({
            archiveId:     archive.id,
            contributorId: contributor.id,
            emailType:     'story_prompt',
            promptId:      prompt.promptId,
          })

          await resend.emails.send({
            from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      contributor.email,
            replyTo: buildReplyAddress(replyToken),
            subject: buildStoryPromptSubject(archive.name, lang),
            html:    buildStoryPromptEmail(
              contributor.name?.split(' ')[0] ?? contributor.name ?? 'Hello',
              archive.name,
              ownerName.split(' ')[0],
              prompt.text,
              portalUrl,
              lang,
            ),
            headers: {
              'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
              'X-Entity-Ref-ID':  `basalith-${archive.id}-story-${Date.now()}`,
              'Precedence':       'bulk',
            },
          })

          textBatches++
        } catch (contribErr: unknown) {
          console.error('[story-prompt-monday] contributor error:', contribErr instanceof Error ? contribErr.message : contribErr)
        }
      }

      // ── Photo-based path: one photo per archive for photo-rich archives ─────
      if (!archiveIsPhotoLight) {
        try {
          const { data: photos } = await supabaseAdmin
            .from('photographs')
            .select('id, storage_path, ai_era_estimate, priority_score')
            .eq('archive_id', archive.id)
            .eq('status', 'unlabelled')
            .is('story_prompt_sent_at', null)
            .order('priority_score', { ascending: false })
            .limit(1)

          const selectedPhoto = photos?.[0]
          if (!selectedPhoto) continue

          const photoUrl = getEmailPhotoUrl(selectedPhoto.id)

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

          // Only send to contributors who still have photos to see
          const photoContributors = []
          for (const c of contributors) {
            const { data: s } = await supabaseAdmin
              .from('contributor_photo_sends')
              .select('photograph_id')
              .eq('contributor_id', c.id)
            const seen  = (s ?? []).length
            const unseen = Math.max(0, (totalPhotos ?? 0) - seen)
            if (unseen >= MIN_UNSEEN_PHOTOS) photoContributors.push(c)
          }

          for (const contributor of photoContributors) {
            try {
              await resend.emails.send({
                from:    `The ${archive.family_name} Archive <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
                to:      contributor.email,
                subject: `Monday mystery — what was happening here? · ${archive.name}`,
                html:    buildMondayPhotoEmail(archive.family_name, photoUrl, selectedPhoto.ai_era_estimate, dateStr),
                headers: {
                  'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
                  'X-Entity-Ref-ID':  `basalith-${archive.id}-photo-${Date.now()}`,
                  'Precedence':       'bulk',
                },
              })
            } catch (e) {
              console.error(`[story-prompt-monday] photo email failed for ${contributor.email}:`, e instanceof Error ? e.message : e)
            }
          }

          photoBatches++
        } catch (photoErr: unknown) {
          console.error('[story-prompt-monday] photo path error:', photoErr instanceof Error ? photoErr.message : photoErr)
        }
      }
    } catch (err: unknown) {
      console.error(`[story-prompt-monday] archive ${archive.id} failed:`, err instanceof Error ? err.message : err)
    }
  }

  return Response.json({ photoBatches, textBatches, total: archives?.length ?? 0, isTest })
}

// ── Email builders ─────────────────────────────────────────────────────────────

function buildStoryPromptSubject(archiveName: string, lang: string): string {
  const subjects: Record<string, string> = {
    en:  `A memory only you can share · ${archiveName}`,
    zh:  `只有您能分享的记忆 · ${archiveName}`,
    yue: `只有你能分享嘅記憶 · ${archiveName}`,
    ja:  `あなただけが共有できる記憶 · ${archiveName}`,
    es:  `Un recuerdo que solo tú puedes compartir · ${archiveName}`,
    vi:  `Một ký ức chỉ bạn mới có thể chia sẻ · ${archiveName}`,
    ko:  `당신만 공유할 수 있는 기억 · ${archiveName}`,
    tl:  `Isang alaala na ikaw lamang ang makakapagbahagi · ${archiveName}`,
  }
  return subjects[lang] ?? subjects.en
}

function buildStoryPromptEmail(
  firstName:     string,
  archiveName:   string,
  ownerFirstName: string,
  promptText:    string,
  portalUrl:     string,
  lang:          string,
): string {
  const l: Record<string, { greeting: string; intro: string; replyLabel: string; replyNote: string; voiceCta: string }> = {
    en:  { greeting: `${firstName},`, intro: 'A memory only you can share.', replyLabel: 'Just reply to this email.', replyNote: 'No login. No portal. Just your words sent back to us.', voiceCta: 'Or record a voice note →' },
    zh:  { greeting: `${firstName}，`, intro: '一个只有您能分享的记忆。', replyLabel: '直接回复此邮件即可。', replyNote: '无需登录。无需访问页面。', voiceCta: '或录制语音留言 →' },
    yue: { greeting: `${firstName}，`, intro: '一個只有你能分享嘅記憶。', replyLabel: '直接回覆此電郵即可。', replyNote: '唔需要登入。唔需要訪問頁面。', voiceCta: '或錄製語音留言 →' },
    ja:  { greeting: `${firstName}さん、`, intro: 'あなただけが共有できる記憶。', replyLabel: 'このメールに返信するだけです。', replyNote: 'ログイン不要。ポータル不要。', voiceCta: 'または音声で録音する →' },
    es:  { greeting: `${firstName},`, intro: 'Un recuerdo que solo tú puedes compartir.', replyLabel: 'Solo responde este correo.', replyNote: 'Sin inicio de sesión. Sin portal.', voiceCta: 'O graba una nota de voz →' },
    vi:  { greeting: `${firstName},`, intro: 'Một ký ức chỉ bạn mới có thể chia sẻ.', replyLabel: 'Chỉ cần trả lời email này.', replyNote: 'Không cần đăng nhập. Không cần cổng thông tin.', voiceCta: 'Hoặc ghi chú giọng nói →' },
  }
  const ui = l[lang] ?? l.en

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">A MEMORY FOR THE ARCHIVE</p>
  </div>
  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${ui.greeting}</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0 0 32px">${ui.intro}</p>
    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:24px 28px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">${promptText}</p>
    </div>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0 0 8px;text-align:center">${ui.replyLabel}</p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;line-height:1.7;margin:0 0 28px;text-align:center">${ui.replyNote}</p>
    <a href="${portalUrl}" style="display:inline-block;background:transparent;color:#C4A24A;border:1px solid rgba(196,162,74,0.3);font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;text-decoration:none;padding:10px 20px">${ui.voiceCta}</a>
  </div>
  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:16px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:20px 0 0">BASALITH · XYZ<br>${archiveName}</p>
  </div>
</body>
</html>`
}

function buildMondayPhotoEmail(
  familyName:  string,
  photoUrl:    string,
  eraEstimate: string | null,
  dateStr:     string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">THE ${familyName.toUpperCase()} ARCHIVE</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">MONDAY MYSTERY · ${dateStr}</p>
  </div>
  <div style="padding:24px 32px 0">
    <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#F0EDE6;margin:0 0 8px">We found this photograph.</h2>
    <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#706C65;margin:0 0 24px">Nobody has labeled it yet.${eraEstimate ? ` Our AI thinks it is from ${eraEstimate}.` : ''}</p>
  </div>
  <div style="margin:0"><img src="${photoUrl}" width="600" style="display:block;width:100%;max-width:600px;height:auto" alt="Monday mystery photograph"></div>
  <div style="padding:32px">
    <div style="border-left:3px solid rgba(196,162,74,0.4);padding:16px 20px;margin-bottom:24px">
      <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">What do you think was happening here? Who do you recognize? Where do you think this was taken?</p>
    </div>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#B8B4AB;line-height:1.7;margin:0 0 24px">Reply to this email with whatever you remember — or your best guess. On Friday we will share everything the family contributed about this photograph.</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#A08A52;margin:0">REVEAL ARRIVES FRIDAY · REPLY WITH WHAT YOU KNOW</p>
  </div>
  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:20px 0 0">BASALITH · XYZ<br>The ${familyName} Archive</p>
  </div>
</body>
</html>`
}
