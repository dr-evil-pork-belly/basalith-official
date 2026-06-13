import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { resend } from '@/lib/resend'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { buildEntitySystemPrompt } from '@/lib/entityContext'

const anthropic = new Anthropic()

function isDeposit(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.endsWith('?')) return false
  const questionStarters = [
    'what','how','why','when','where','who',
    'can','could','would','should',
    'do','does','is','are','will',
  ]
  const firstWord = trimmed.split(' ')[0].toLowerCase()
  if (questionStarters.includes(firstWord)) return false
  return trimmed.length > 30
}

export async function POST(req: Request) {
  console.log('=== ENTITY CHAT POST ===')
  try {
    const body = await req.json()
    const { message, sessionId, conversationHistory } = body
    const requestedArchiveId: string | undefined = body.archiveId

    if (!message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Step 1: Resolve caller identity ───────────────────────────────────────
    // Priority: owner session → x-archive-id header → body.archiveId (mobile fallback) → contributor bearer token
    // The x-archive-id / body.archiveId mobile paths are a DEPRECATED shim,
    // not Supabase sessions. Kept for the existing iOS build until the
    // Phase 7 OTP build ships, then removed in Phase 8.
    const session = await getSessionUser()

    const nextReq          = req as import('next/server').NextRequest
    const headerArchiveId  = nextReq.headers.get('x-archive-id')
    const authHeader       = nextReq.headers.get('authorization')
    const contributorToken = authHeader?.replace('Bearer ', '') || body.contributorToken
    const bodyArchiveId    = typeof requestedArchiveId === 'string' && requestedArchiveId ? requestedArchiveId : null

    console.log('[entity-chat] auth sources — session:', !!session?.archiveId,
      '| header:', !!headerArchiveId, '| body:', !!bodyArchiveId)

    let authorizedArchiveId: string | null = null
    let callerType: 'owner' | 'contributor' | null = null

    if (session?.archiveId) {
      authorizedArchiveId = session.archiveId
      callerType          = 'owner'
    } else if (headerArchiveId || bodyArchiveId) {
      // Mobile owner: validate the archiveId from header or body against DB
      const candidateId = headerArchiveId ?? bodyArchiveId!
      const { data: mobileArchive } = await supabaseAdmin
        .from('archives')
        .select('id, status')
        .eq('id', candidateId)
        .maybeSingle()
      if (mobileArchive && (!mobileArchive.status || mobileArchive.status === 'active')) {
        authorizedArchiveId = candidateId
        callerType          = 'owner'
      }
    } else if (contributorToken) {
      const { data: contributor } = await supabaseAdmin
        .from('contributors')
        .select('archive_id, status')
        .eq('access_token', contributorToken)
        .eq('status', 'active')
        .maybeSingle()

      if (contributor) {
        authorizedArchiveId = contributor.archive_id
        callerType          = 'contributor'
      }
    }

    console.log('[entity-chat] authorized:', authorizedArchiveId?.substring(0, 8) ?? 'NONE', '| caller:', callerType)

    if (!authorizedArchiveId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Step 2: No IDOR risk — archiveId comes from the validated candidate ────
    // requestedArchiveId === authorizedArchiveId by construction above

    const archiveId = authorizedArchiveId

    // ── Step 3: Contributor access check ──────────────────────────────────────
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

    console.log('[entity-chat] archiveId:', archiveId, '| caller:', callerType, '| msgLen:', message?.length, '| msgPreview:', message?.substring(0, 60))

    const { systemPrompt, usedDepositIds } = await buildEntitySystemPrompt(archiveId, message)

    const messages = [
      ...(conversationHistory || []),
      { role: 'user' as const, content: message },
    ]

    const aiResponse = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    })

    const entityResponse =
      aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

    const currentSessionId = sessionId || crypto.randomUUID()

    // Save conversation (non-fatal)
    supabaseAdmin.from('entity_conversations').insert([
      { archive_id: archiveId, session_id: currentSessionId, role: 'user', content: message },
      { archive_id: archiveId, session_id: currentSessionId, role: 'entity', content: entityResponse },
    ]).then(({ error }) => {
      if (error) console.warn('entity_conversations insert skipped:', error.message)
    })

    // Auto-save statement responses as deposits + create training pair (non-fatal, fire-and-forget)
    const wasDeposit = isDeposit(message)
    console.log('[entity-chat] wasDeposit:', wasDeposit, '| firstWord:', message.trim().split(' ')[0], '| endsWithQ:', message.trim().endsWith('?'))
    if (wasDeposit) {
      console.log('[entity-chat] entering deposit+training IIFE')
      void (async () => {
        try {
          const { data: dep, error: depErr } = await supabaseAdmin
            .from('owner_deposits')
            .insert({ archive_id: archiveId, prompt: 'Entity chat deposit', response: message, essence_status: 'pending' })
            .select('id')
            .single()

          if (depErr) {
            console.warn('[entity-chat] deposit save failed:', depErr.message)
            return
          }

          if (dep?.id) void classifyDeposit({ depositId: dep.id, archiveId, text: message })

          const { data: arch } = await supabaseAdmin
            .from('archives')
            .select('owner_name, name, preferred_language')
            .eq('id', archiveId)
            .single()

          if (!arch) {
            console.warn('[entity-chat] archive not found for training pair:', archiveId)
            return
          }

          await createTrainingPairFromDeposit(
            { id: dep?.id, archive_id: archiveId, prompt: 'Entity chat deposit', response: message },
            arch.owner_name || 'Unknown',
            arch.name,
            arch.preferred_language || 'en',
          )
        } catch (e) {
          console.error('[entity-chat] deposit/training error:', e instanceof Error ? e.message : e)
        }
      })()
    }

    // Track deposit usage + send memory confirmation on first use (non-blocking)
    if (usedDepositIds.length > 0) {
      Promise.resolve().then(async () => {
        try {
          await supabaseAdmin.rpc('increment_deposit_access', { deposit_ids: usedDepositIds })

          // First-use deposits with a contributor attribution → send notification
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
<p style="font-size:17px;font-weight:300;color:#F0EDE6;margin:0 0 8px;line-height:1.7">Something you contributed to ${ownerFirst}'s archive was just used by the entity.</p>
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
