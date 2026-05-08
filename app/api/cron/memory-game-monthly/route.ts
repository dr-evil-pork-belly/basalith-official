import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { generateGameScenario } from '@/lib/memoryGameScenarios'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic     = 'force-dynamic'
export const maxDuration = 120

const REVEAL_DAYS = 7

function validateCronAuth(req: NextRequest): boolean {
  const p        = new URL(req.url).searchParams
  const secret   = req.headers.get('authorization')?.replace('Bearer ', '') ?? p.get('secret') ?? ''
  const expected = process.env.CRON_SECRET ?? ''
  return !!expected && secret === expected
}

// ── Start monthly game ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!validateCronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isTest = searchParams.get('test') === 'true'
  const force  = searchParams.get('force') === 'true'

  if (!isTest && !force && new Date().getDate() !== 1) {
    return NextResponse.json({ skipped: true, reason: 'Not the 1st of the month' })
  }

  // ── Step 1: fetch archives ──────────────────────────────────────────────────
  const { data: archives, error: archivesErr } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name, owner_email')
    .eq('status', 'active')

  console.log('[memory-game] starting — archives found:', archives?.length ?? 0,
    archivesErr ? 'ERROR: ' + archivesErr.message : '')

  if (archivesErr) {
    console.error('[memory-game] archives query failed:', archivesErr.message)
    return NextResponse.json({ error: archivesErr.message }, { status: 500 })
  }

  let started = 0
  const skipped: { id: string; name: string; reason: string }[] = []

  for (const archive of archives ?? []) {
    console.log('[memory-game] processing:', archive.id, archive.name)

    try {
      // ── Step 2: fetch contributors ────────────────────────────────────────
      const { data: contributors, error: contribErr } = await supabaseAdmin
        .from('contributors')
        .select('id, email, name, preferred_language, access_token, status')
        .eq('archive_id', archive.id)

      const activeContributors = (contributors ?? []).filter(c => c.status === 'active')

      console.log('[memory-game] contributors for', archive.name, '—',
        'total:', contributors?.length ?? 0,
        'active:', activeContributors.length,
        contribErr ? 'ERROR: ' + contribErr.message : '',
        contributors?.map(c => `${c.name}(${c.status})`).join(', ') ?? 'none')

      // Do NOT skip if no active contributors — create the session anyway.
      // The owner email is sufficient for a game to run.
      if (!archive.owner_email && activeContributors.length === 0) {
        console.log('[memory-game] skipping', archive.name, '— no owner email and no contributors')
        skipped.push({ id: archive.id, name: archive.name, reason: 'no_recipients' })
        continue
      }

      // ── Step 3: generate scenario ──────────────────────────────────────────
      console.log('[memory-game] generating scenario for:', archive.name)

      let scenario: Awaited<ReturnType<typeof generateGameScenario>>
      try {
        scenario = await generateGameScenario(archive.id, archive.owner_name ?? archive.name)
        console.log('[memory-game] scenario generated:', scenario?.text?.substring(0, 80))
      } catch (scenErr: unknown) {
        console.error('[memory-game] scenario generation failed for', archive.name, ':', scenErr instanceof Error ? scenErr.message : scenErr)
        skipped.push({ id: archive.id, name: archive.name, reason: 'scenario_failed' })
        continue
      }

      if (!scenario) {
        console.error('[memory-game] scenario is null for:', archive.name)
        skipped.push({ id: archive.id, name: archive.name, reason: 'scenario_null' })
        continue
      }

      // ── Step 4: insert session ─────────────────────────────────────────────
      const revealAt = new Date(Date.now() + REVEAL_DAYS * 86_400_000).toISOString()

      const insertPayload = {
        archive_id:    archive.id,
        game_type:     'story',
        scenario_text: scenario.text,
        scenario_type: scenario.type,
        dimension:     scenario.dimension,
        status:        'active',
        reveal_at:     revealAt,
        closes_at:     revealAt,   // kept for backward compat with existing photo-game schema
        metadata:      { templateId: scenario.templateId },
      }

      console.log('[memory-game] inserting session for:', archive.name, '— payload keys:', Object.keys(insertPayload).join(', '))

      const { data: session, error: sessionErr } = await supabaseAdmin
        .from('memory_game_sessions')
        .insert(insertPayload)
        .select('id')
        .single()

      console.log('[memory-game] insert result — id:', session?.id ?? 'null', 'error:', sessionErr?.message ?? 'none')

      if (sessionErr || !session) {
        console.error('[memory-game] session insert failed for', archive.name, ':', sessionErr?.message, sessionErr?.details ?? '', sessionErr?.hint ?? '')
        skipped.push({ id: archive.id, name: archive.name, reason: `insert_failed: ${sessionErr?.message}` })
        continue
      }

      // ── Step 5: send emails ────────────────────────────────────────────────
      const revealDateStr = new Date(revealAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

      const recipients: { email: string; name: string; token: string | null; lang: string }[] = [
        ...activeContributors.map(c => ({
          email: c.email,
          name:  c.name ?? c.email,
          token: c.access_token ?? null,
          lang:  c.preferred_language ?? 'en',
        })),
      ]

      if (archive.owner_email) {
        recipients.push({ email: archive.owner_email, name: archive.owner_name ?? 'Owner', token: null, lang: 'en' })
      }

      console.log('[memory-game] sending to', recipients.length, 'recipients for', archive.name)

      let emailsSent = 0
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
          emailsSent++
        } catch (emailErr) {
          console.error('[memory-game] email failed for', r.email, ':', emailErr instanceof Error ? emailErr.message : emailErr)
        }
      }

      console.log('[memory-game] started game for', archive.name, '— session:', session.id, '— emails sent:', emailsSent)
      started++

    } catch (err: unknown) {
      console.error('[memory-game] unexpected error for archive', archive.id, archive.name, ':', err instanceof Error ? err.message : err)
      skipped.push({ id: archive.id, name: archive.name, reason: `unexpected: ${err instanceof Error ? err.message : 'unknown'}` })
    }
  }

  console.log('[memory-game] complete — started:', started, 'skipped:', skipped.length)

  return NextResponse.json({ started, total: archives?.length ?? 0, skipped })
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

  console.log('[memory-game-reveal] sessions due for reveal:', toReveal?.length ?? 0)

  if (!toReveal?.length) return NextResponse.json({ revealed: 0 })

  let revealed = 0

  for (const session of toReveal) {
    try {
      const { data: responses } = await supabaseAdmin
        .from('memory_game_responses')
        .select('id, response_text, contributor_id, is_owner')
        .eq('session_id', session.id)

      console.log('[memory-game-reveal] session', session.id, '— responses:', responses?.length ?? 0)

      // Mark as revealed regardless of whether there are responses
      await supabaseAdmin
        .from('memory_game_sessions')
        .update({ status: 'revealed' })
        .eq('id', session.id)

      if (!responses?.length) {
        console.log('[memory-game-reveal] no responses for session', session.id, '— closing silently')
        continue
      }

      const { data: archive } = await supabaseAdmin
        .from('archives')
        .select('id, name, family_name, owner_name, owner_email')
        .eq('id', session.archive_id)
        .single()

      if (!archive) { console.error('[memory-game-reveal] archive not found for session', session.id); continue }

      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('id, email, name, preferred_language, access_token')
        .eq('archive_id', session.archive_id)
        .eq('status', 'active')

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

      const allRecipients = [
        ...(contributors ?? []).map(c => ({ email: c.email, name: c.name ?? c.email, token: c.access_token, lang: c.preferred_language ?? 'en' })),
        ...(archive.owner_email ? [{ email: archive.owner_email, name: archive.owner_name ?? 'Owner', token: null as string | null, lang: 'en' }] : []),
      ]

      for (const r of allRecipients) {
        try {
          const portalUrl = r.token ? `${siteUrl}/contribute/${r.token}` : `${siteUrl}/archive/dashboard`
          await resend.emails.send({
            from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
            to:      r.email,
            subject: `Memory game answers revealed · ${archive.name}`,
            html:    buildRevealEmail(r.name.split(' ')[0], archive.name, session.scenario_text, responses.map(r => r.response_text), portalUrl, r.lang),
            headers: { 'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>', 'X-Entity-Ref-ID': `basalith-reveal-${session.id}-${r.email}`, 'Precedence': 'bulk' },
          })
        } catch {}
      }

      // Training pairs (fire-and-forget)
      void (async () => {
        try {
          const { data: arch } = await supabaseAdmin.from('archives').select('owner_name, name, preferred_language').eq('id', session.archive_id).single()
          if (!arch) return
          for (const resp of responses) {
            if (resp.response_text.length < 30) continue
            await createTrainingPairFromDeposit(
              { id: resp.id, archive_id: session.archive_id, prompt: session.scenario_text, response: resp.response_text },
              arch.owner_name ?? 'Unknown', arch.name, arch.preferred_language ?? 'en', 'game_response',
            )
          }
        } catch (e) {
          console.warn('[memory-game-reveal] training pairs failed:', e instanceof Error ? e.message : e)
        }
      })()

      revealed++
    } catch (err: unknown) {
      console.error('[memory-game-reveal] error for session', session.id, ':', err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ revealed })
}

// ── Email builders ─────────────────────────────────────────────────────────────

function buildGameStartEmail(firstName: string, archiveName: string, scenarioText: string, revealDate: string, portalUrl: string, sessionId: string, lang: string): string {
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

function buildRevealEmail(firstName: string, archiveName: string, scenarioText: string, answers: string[], portalUrl: string, lang: string): string {
  const answerCards = answers.map(a => `<div style="border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin-bottom:12px;background:rgba(196,162,74,0.03)"><p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.75;margin:0;font-style:italic">${a.replace(/</g, '&lt;')}</p></div>`).join('')
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
    <div style="border-left:3px solid rgba(196,162,74,0.3);padding:16px 20px;margin:0 0 32px"><p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#C4A24A;line-height:1.6;margin:0;font-style:italic">${scenarioText}</p></div>
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
