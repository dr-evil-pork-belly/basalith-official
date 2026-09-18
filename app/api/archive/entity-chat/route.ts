import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse, after } from 'next/server'
import { resend } from '@/lib/resend'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { buildEntitySystemPrompt as buildContextPrompt } from '@/lib/entityContext'
import { logGroundingGap } from '@/lib/groundingGapLog'
import {
  isDeposit,
  sanitizeHistory,
  gapLanguage,
  readEntityPipeline,
  generateGroundedFamilyReply,
} from '@/lib/familyEntity'

const anthropic = new Anthropic()

// The family entity. Owner (Supabase session, web or iOS) or contributor
// (bearer access token, gated by archives.contributor_entity_access).
//
// September 16, 2026: two pipelines behind one contract, chosen per archive by
// archives.entity_pipeline. 'context' is the pre-move path, byte for byte:
// lib/entityContext.ts, Opus, no verifier. 'grounded' is the succession
// pipeline with the personal prompt scope: frozen layer, Sonnet, Control B,
// gap reply in the reader's language, gap log. The switch is temporary; see
// lib/familyEntity.ts. Two changes apply to BOTH paths because they were
// wrong on their own: a contributor's turn is never saved as the owner's
// deposit (it used to be, unattributed), and every post-response write runs
// under after() instead of void, per CLAUDE.md section 1.
//
// Request and response shapes are unchanged: { message, sessionId,
// conversationHistory } in, { response, sessionId, wasDeposit } out. The iOS
// app depends on that.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, sessionId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Step 1: Resolve caller identity ───────────────────────────────────────
    // Owner Supabase session (ownership verified against the archives table) or
    // contributor bearer token (validated against contributors.access_token).
    const session = await getSessionUser()

    const nextReq          = req as import('next/server').NextRequest
    const authHeader       = nextReq.headers.get('authorization')
    const contributorToken = authHeader?.replace('Bearer ', '') || body.contributorToken

    let authorizedArchiveId: string | null = null
    let callerType: 'owner' | 'contributor' | null = null
    let contributorLanguage: string | null = null

    if (session?.archiveId) {
      // A session carrying an archiveId is not proof of ownership (getSessionUser
      // fills archiveId for successors too), so verify against the archives table.
      const { data: ownerRow } = await supabaseAdmin
        .from('archives')
        .select('owner_user_id')
        .eq('id', session.archiveId)
        .maybeSingle()
      if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      authorizedArchiveId = session.archiveId
      callerType          = 'owner'
    } else if (contributorToken) {
      const { data: contributor } = await supabaseAdmin
        .from('contributors')
        .select('archive_id, status, preferred_language')
        .eq('access_token', contributorToken)
        .eq('status', 'active')
        .maybeSingle()

      if (contributor) {
        authorizedArchiveId = contributor.archive_id
        callerType          = 'contributor'
        contributorLanguage = (contributor.preferred_language as string | null) ?? null
      }
    }

    if (!authorizedArchiveId || !callerType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const archiveId = authorizedArchiveId

    // ── Step 2: Contributor access check ──────────────────────────────────────
    if (callerType === 'contributor') {
      const { data: archiveAccess } = await supabaseAdmin
        .from('archives')
        .select('contributor_entity_access')
        .eq('id', archiveId)
        .single()

      if (!archiveAccess || archiveAccess.contributor_entity_access === 'none') {
        return NextResponse.json(
          { error: 'Entity access not yet available for contributors' },
          { status: 403 }
        )
      }
    }

    const history  = sanitizeHistory(body.conversationHistory)
    const pipeline = await readEntityPipeline(archiveId)

    console.log('[entity-chat] archiveId:', archiveId, '| caller:', callerType, '| pipeline:', pipeline, '| msgLen:', message.length)

    // ── Step 3: Answer ────────────────────────────────────────────────────────
    let entityResponse = ''
    let usedDepositIds: string[] = []

    if (pipeline === 'grounded') {
      const { data: arch } = await supabaseAdmin
        .from('archives')
        .select('name, owner_name, preferred_language')
        .eq('id', archiveId)
        .single()
      if (!arch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const language = gapLanguage(contributorLanguage, arch.preferred_language as string | null)
      const out = await generateGroundedFamilyReply({
        archiveId,
        ownerName:   (arch.owner_name as string | null) ?? (arch.name as string),
        archiveName: arch.name as string,
        message,
        history,
        language,
      })
      console.log(`[entity-chat] ${archiveId} ${out.selection} basis=${out.basis}`)

      entityResponse = out.reply
      usedDepositIds = out.usedDepositIds

      // Every question the frozen archive could not ground, as on the
      // succession route. after() is load-bearing: a bare dispatch dies on
      // lambda freeze and the gap is silently lost.
      if (out.basis !== 'deposit') {
        const basis = out.basis
        after(() => logGroundingGap({ archiveId, question: message, basis }))
      }
    } else {
      // The pre-move path, unchanged: keyword-selected raw deposits and family
      // material, Opus, no verifier.
      const built = await buildContextPrompt(archiveId, message)
      const aiResponse = await anthropic.messages.create({
        model:      'claude-opus-4-6',
        max_tokens: 600,
        system:     built.systemPrompt,
        messages:   [...history, { role: 'user' as const, content: message }],
      })
      entityResponse = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''
      usedDepositIds = built.usedDepositIds
    }

    const currentSessionId = sessionId || crypto.randomUUID()

    // ── Step 4: Post-response writes, all under after() ───────────────────────
    after(async () => {
      const { error } = await supabaseAdmin.from('entity_conversations').insert([
        { archive_id: archiveId, session_id: currentSessionId, role: 'user',   content: message },
        { archive_id: archiveId, session_id: currentSessionId, role: 'entity', content: entityResponse },
      ])
      if (error) console.warn('entity_conversations insert skipped:', error.message)
    })

    // Auto-save an OWNER's statement as a deposit and a training pair. Owner
    // only. Until September 16, 2026 this ran for contributors too and wrote
    // their words into owner_deposits with no attribution, from where they
    // became first-person training pairs. A contributor's deliberate deposit
    // path is /api/contribute/answer, which attributes correctly.
    const wasDeposit = callerType === 'owner' && isDeposit(message)
    if (wasDeposit) {
      after(async () => {
        try {
          const { data: dep, error: depErr } = await supabaseAdmin
            .from('owner_deposits')
            .insert({ archive_id: archiveId, prompt: 'Entity chat deposit', response: message, essence_status: 'pending' })
            .select('id')
            .single()

          if (depErr || !dep?.id) {
            console.warn('[entity-chat] deposit save failed:', depErr?.message)
            return
          }

          try { await classifyDeposit({ depositId: dep.id, archiveId, text: message }) } catch {}

          const { data: arch } = await supabaseAdmin
            .from('archives')
            .select('owner_name, name, preferred_language')
            .eq('id', archiveId)
            .single()
          if (!arch) return

          await createTrainingPairFromDeposit(
            { id: dep.id, archive_id: archiveId, prompt: 'Entity chat deposit', response: message },
            arch.owner_name || 'Unknown',
            arch.name,
            arch.preferred_language || 'en',
          )
        } catch (e) {
          console.error('[entity-chat] deposit/training error:', e instanceof Error ? e.message : e)
        }
      })
    }

    // Track deposit usage and send the memory confirmation on first use. On
    // the grounded path usedDepositIds are the owner_deposits behind the
    // selected pairs; contributor deposits are never among them (owner-only
    // corpus), so the first-use email below does not fire there. Kept intact
    // for the 'context' path and for the day contributor material returns.
    if (usedDepositIds.length > 0) {
      after(async () => {
        try {
          await supabaseAdmin.rpc('increment_deposit_access', { deposit_ids: usedDepositIds })

          const { data: firstUse } = await supabaseAdmin
            .from('owner_deposits')
            .select('id, contributor_id, contributor_name, prompt, response, archive_id')
            .in('id', usedDepositIds)
            .eq('times_accessed', 1)
            .not('contributor_id', 'is', null)

          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'

          for (const deposit of firstUse ?? []) {
            const [{ data: contributor }, { data: archive }] = await Promise.all([
              supabaseAdmin.from('contributors').select('email, name, preferred_language, access_token').eq('id', deposit.contributor_id).single(),
              supabaseAdmin.from('archives').select('name, owner_name').eq('id', deposit.archive_id).single(),
            ])

            if (!contributor?.email || !archive) continue

            const portalUrl     = contributor.access_token ? `${siteUrl}/contribute/${contributor.access_token}` : siteUrl
            const firstName     = contributor.name.split(' ')[0]
            const ownerFirst    = (archive.owner_name ?? 'them').split(' ')[0]
            const depositPrompt = (deposit.prompt ?? '').replace('Entity chat deposit', 'their life and experiences')
            const preview       = (deposit.response ?? '').substring(0, 120)

            await resend.emails.send({
              from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
              to:      contributor.email,
              subject: `Your memory was used in ${archive.name}`,
              headers: { 'X-Entity-Ref-ID': `basalith-mc-${deposit.id}`, 'Precedence': 'bulk' },
              html: `<!DOCTYPE html><html><body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
<p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archive.name.toUpperCase()}</p>
<p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0 0 24px">YOUR MEMORY WAS USED</p>
<p style="font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 8px">${firstName},</p>
<p style="font-size:17px;font-weight:300;color:#F0EDE6;margin:0 0 8px;line-height:1.7">Something you contributed to ${ownerFirst}'s Basalith was just used by the entity.</p>
<p style="font-size:15px;font-style:italic;color:#706C65;margin:0 0 32px;line-height:1.7">Someone asked ${ownerFirst}'s entity about "${depositPrompt}." The entity answered using your words.</p>
<div style="border-left:3px solid rgba(196,162,74,0.4);padding:20px 24px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0 0 12px">YOUR CONTRIBUTION</p>
  <p style="font-size:15px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.8;margin:0">&ldquo;${preview}&hellip;&rdquo;</p>
</div>
<p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">Your words are speaking for ${ownerFirst}.<br/>Keep contributing. The more you add, the more accurately the entity represents them.</p>
<a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">ADD MORE MEMORIES →</a>
<hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:32px 0">
<p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166">BASALITH · XYZ<br>${archive.name}</p>
</body></html>`,
            })
          }
        } catch (e) {
          console.warn('[entity-chat] deposit tracking error:', e instanceof Error ? e.message : e)
        }
      })
    }

    return NextResponse.json({ response: entityResponse, sessionId: currentSessionId, wasDeposit })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Entity chat error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
