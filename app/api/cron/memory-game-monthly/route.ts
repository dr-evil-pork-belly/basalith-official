import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { generateGameScenario } from '@/lib/memoryGameScenarios'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic    = 'force-dynamic'
export const maxDuration = 120

const REVEAL_DAYS = 7

function validateCronAuth(req: NextRequest): boolean {
  const p       = new URL(req.url).searchParams
  const secret  = req.headers.get('authorization')?.replace('Bearer ', '') ?? p.get('secret') ?? ''
  const expected = process.env.CRON_SECRET ?? ''
  return !!expected && secret === expected
}

// ── Start monthly game ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!validateCronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isTest = searchParams.get('test') === 'true'
  const force  = searchParams.get('force') === 'true'

  // Only run on the 1st of each month
  if (!isTest && !force && new Date().getDate() !== 1) {
    return NextResponse.json({ skipped: true, reason: 'Not the 1st of the month' })
  }

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name, owner_email')
    .eq('status', 'active')

  let started = 0

  for (const archive of archives ?? []) {
    try {
      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('id, email, name, preferred_language, access_token')
        .eq('archive_id', archive.id)
        .eq('status', 'active')

      if (!contributors?.length) continue

      const scenario  = await generateGameScenario(archive.id, archive.owner_name ?? archive.name)
      const revealAt  = new Date(Date.now() + REVEAL_DAYS * 86_400_000).toISOString()

      const { data: session, error: sessionErr } = await supabaseAdmin
        .from('memory_game_sessions')
        .insert({
          archive_id:    archive.id,
          game_type:     'story',
          scenario_text: scenario.text,
          scenario_type: scenario.type,
          dimension:     scenario.dimension,
          status:        'active',
          reveal_at:     revealAt,
          // photo_game required fields — nullable for story mode
          closes_at:     revealAt,
          metadata:      { templateId: scenario.templateId },
        })
        .select('id')
        .single()

      if (sessionErr || !session) {
        console.error('[memory-game-monthly] session insert failed:', sessionErr?.message)
        continue
      }

      const revealDateStr = new Date(revealAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

      // Send to all contributors + archive owner
      const recipients: { email: string; name: string; token: string | null; lang: string }[] = [
        ...contributors.map(c => ({
          email: c.email,
          name:  c.name ?? c.email,
          token: c.access_token ?? null,
          lang:  c.preferred_language ?? 'en',
        })),
      ]

      if (archive.owner_email) {
        recipients.push({ email: archive.owner_email, name: archive.owner_name ?? 'Owner', token: null, lang: 'en' })
      }

      for (const r of recipients) {
        try {
          const portalUrl = r.token ? `${siteUrl}/contribute/${r.token}` : `${siteUrl}/archive/dashboard`
          await resend.emails.send({
            from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      r.email,
            subject: `A new memory game · ${archive.name}`,
            html:    buildGameStartEmail(
              r.name.split(' ')[0],
              archive.name,
              scenario.text,
              revealDateStr,
              portalUrl,
              session.id,
              r.lang,
            ),
            headers: {
              'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
              'X-Entity-Ref-ID':  `basalith-game-${session.id}-${r.email}`,
              'Precedence':       'bulk',
            },
          })
        } catch (emailErr) {
          console.error('[memory-game-monthly] email failed for', r.email, emailErr instanceof Error ? emailErr.message : emailErr)
        }
      }

      started++
    } catch (err: unknown) {
      console.error('[memory-game-monthly] archive error:', archive.id, err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ started, total: archives?.length ?? 0 })
}

// ── Check for sessions to reveal (called nightly) ─────────────────────────────

export async function POST(req: NextRequest) {
  if (!validateCronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()

  const { data: toReveal } = await supabaseAdmin
    .from('memory_game_sessions')
    .select('id, archive_id, scenario_text, reveal_at')
    .eq('game_type', 'story')
    .eq('status', 'active')
    .lte('reveal_at', now)

  if (!toReveal?.length) return NextResponse.json({ revealed: 0 })

  let revealed = 0

  for (const session of toReveal) {
    try {
      // Get all responses
      const { data: responses } = await supabaseAdmin
        .from('memory_game_responses')
        .select('id, response_text, contributor_id, is_owner')
        .eq('session_id', session.id)

      if (!responses?.length) {
        // No responses — just close
        await supabaseAdmin
          .from('memory_game_sessions')
          .update({ status: 'revealed' })
          .eq('id', session.id)
        continue
      }

      // Mark session as revealed
      await supabaseAdmin
        .from('memory_game_sessions')
        .update({ status: 'revealed' })
        .eq('id', session.id)

      // Get archive + contributors
      const { data: archive } = await supabaseAdmin
        .from('archives')
        .select('id, name, family_name, owner_name, owner_email')
        .eq('id', session.archive_id)
        .single()

      if (!archive) continue

      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('id, email, name, preferred_language, access_token')
        .eq('archive_id', session.archive_id)
        .eq('status', 'active')

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

      // Send reveal email to all participants
      const allRecipients = [
        ...(contributors ?? []).map(c => ({
          email: c.email,
          name:  c.name ?? c.email,
          token: c.access_token,
          lang:  c.preferred_language ?? 'en',
        })),
        ...(archive.owner_email ? [{ email: archive.owner_email, name: archive.owner_name ?? 'Owner', token: null, lang: 'en' }] : []),
      ]

      for (const r of allRecipients) {
        try {
          const portalUrl = r.token ? `${siteUrl}/contribute/${r.token}` : `${siteUrl}/archive/dashboard`
          await resend.emails.send({
            from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      r.email,
            subject: `Memory game answers revealed · ${archive.name}`,
            html:    buildRevealEmail(
              r.name.split(' ')[0],
              archive.name,
              session.scenario_text,
              responses.map(r => r.response_text),
              portalUrl,
              r.lang,
            ),
            headers: {
              'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
              'X-Entity-Ref-ID':  `basalith-reveal-${session.id}-${r.email}`,
              'Precedence':       'bulk',
            },
          })
        } catch {}
      }

      // Create training pairs from all responses (fire-and-forget)
      void (async () => {
        try {
          const { data: arch } = await supabaseAdmin
            .from('archives')
            .select('owner_name, name, preferred_language')
            .eq('id', session.archive_id)
            .single()
          if (!arch) return

          for (const resp of responses) {
            if (resp.response_text.length < 30) continue
            await createTrainingPairFromDeposit(
              {
                id:         resp.id,
                archive_id: session.archive_id,
                prompt:     session.scenario_text,
                response:   resp.response_text,
              },
              arch.owner_name ?? 'Unknown',
              arch.name,
              arch.preferred_language ?? 'en',
              'game_response',
            )
          }
        } catch (e) {
          console.warn('[memory-game-monthly] training pairs failed:', e instanceof Error ? e.message : e)
        }
      })()

      revealed++
    } catch (err: unknown) {
      console.error('[memory-game-monthly] reveal error:', session.id, err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ revealed })
}

// ── Email builders ─────────────────────────────────────────────────────────────

function buildGameStartEmail(
  firstName:    string,
  archiveName:  string,
  scenarioText: string,
  revealDate:   string,
  portalUrl:    string,
  sessionId:    string,
  lang:         string,
): string {
  const submitUrl = `${portalUrl}?game=${sessionId}`

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">REMEMBER WHEN · MONTHLY GAME</p>
  </div>
  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 8px">${firstName},</p>
    <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F0EDE6;margin:0 0 24px;line-height:1.4">A new memory game has started.</h2>
    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:24px 28px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">${scenarioText}</p>
    </div>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.8;margin:0 0 12px">Answer before ${revealDate}. All answers will be revealed to everyone on that date.</p>
    <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;font-style:italic;color:#706C65;line-height:1.8;margin:0 0 32px">Answers are shown without names — so be honest. This is about the memory, not the person who shared it.</p>
    <a href="${submitUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px">SUBMIT YOUR ANSWER →</a>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:rgba(196,162,74,0.4);margin:24px 0 0">ANSWERS REVEALED ${revealDate.toUpperCase()}</p>
  </div>
  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:16px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:20px 0 0">BASALITH · XYZ<br>${archiveName}</p>
  </div>
</body>
</html>`
}

function buildRevealEmail(
  firstName:    string,
  archiveName:  string,
  scenarioText: string,
  answers:      string[],
  portalUrl:    string,
  lang:         string,
): string {
  const answerCards = answers.map(a => `
    <div style="border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin-bottom:12px;background:rgba(196,162,74,0.03)">
      <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.75;margin:0;font-style:italic">${a.replace(/</g, '&lt;')}</p>
    </div>`).join('')

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">REMEMBER WHEN · ANSWERS REVEALED</p>
  </div>
  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 8px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F0EDE6;margin:0 0 8px;line-height:1.4">The question was:</p>
    <div style="border-left:3px solid rgba(196,162,74,0.3);padding:16px 20px;margin:0 0 32px">
      <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#C4A24A;line-height:1.6;margin:0;font-style:italic">${scenarioText}</p>
    </div>
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#5C6166;margin:0 0 20px">${answers.length} ANSWER${answers.length !== 1 ? 'S' : ''} — NAMES NOT SHOWN</p>
    ${answerCards}
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;line-height:1.8;margin:28px 0">Which answer surprised you most? Reply and tell us why.</p>
    <a href="${portalUrl}" style="display:inline-block;border:1px solid rgba(196,162,74,0.3);color:#C4A24A;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:12px 24px">VISIT YOUR PORTAL →</a>
  </div>
  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06);margin-top:16px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:20px 0 0">BASALITH · XYZ<br>${archiveName}</p>
  </div>
</body>
</html>`
}
