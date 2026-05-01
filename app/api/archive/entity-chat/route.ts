import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

const anthropic = new Anthropic()

// ── Topic keyword map ──────────────────────────────────────────────────────
const TOPIC_KEYWORDS: Record<string, string[]> = {
  money:   ['money', 'financial', 'invest', 'wealth', 'afford', 'cost', 'rich', 'poor', 'business', 'work'],
  family:  ['family', 'children', 'parent', 'mother', 'father', 'wife', 'husband', 'kids', 'grandchildren', 'love'],
  values:  ['believe', 'value', 'right', 'wrong', 'honest', 'integrity', 'principle', 'character'],
  failure: ['fail', 'mistake', 'wrong', 'regret', 'difficult', 'hard', 'challenge', 'crisis'],
  wisdom:  ['advice', 'lesson', 'learn', 'know', 'understand', 'younger', 'wish', 'tell'],
  people:  ['person', 'trust', 'friend', 'relationship', 'team', 'judge'],
  fear:    ['fear', 'afraid', 'worry', 'scared', 'anxious', 'concern'],
  purpose: ['meaning', 'purpose', 'why', 'life', 'death', 'legacy', 'matter'],
}

function extractTopics(message: string): string[] {
  const lower = message.toLowerCase()
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([topic]) => topic)
}

function scoreRelevance(text: string, topics: string[]): number {
  const lower = text.toLowerCase()
  return topics.reduce((score, topic) => {
    const keywords = TOPIC_KEYWORDS[topic] || []
    return score + keywords.filter(k => lower.includes(k)).length
  }, 0)
}

async function buildEntitySystemPrompt(
  archiveId: string,
  currentMessage?: string,
): Promise<{ systemPrompt: string; usedDepositIds: string[] }> {
  const topics = currentMessage ? extractTopics(currentMessage) : []

  // ── Parallel fetches (static data) ────────────────────────────────────────
  const [archive, people, decades, witnessDeposits, voiceRecordingsResult, documentsResult, videosResult] = await Promise.all([
    supabaseAdmin.from('archives').select('*').eq('id', archiveId).single(),
    supabaseAdmin.from('people').select('name, relationship, photo_count').eq('archive_id', archiveId).order('photo_count', { ascending: false }).limit(20),
    supabaseAdmin.from('decade_coverage').select('*').eq('archive_id', archiveId).order('decade'),
    supabaseAdmin.from('witness_deposits').select('contributor_name, relationship, question_text, answer, what_it_captures').eq('archive_id', archiveId).order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('voice_recordings').select('transcript, prompt, language_detected, created_at').eq('archive_id', archiveId).eq('transcript_status', 'complete').not('transcript', 'is', null).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('archive_documents').select('transcript, title, document_type, approximate_decade, created_by, linguistic_patterns').eq('archive_id', archiveId).eq('transcript_status', 'complete').not('transcript', 'is', null).order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('archive_videos').select('transcript, title, video_type, approximate_decade, created_by, language_detected').eq('archive_id', archiveId).eq('transcript_status', 'complete').not('transcript', 'is', null).order('created_at', { ascending: false }).limit(10),
  ])

  // ── Deposit selection ──────────────────────────────────────────────────────
  let depositsData: any[] = []
  const { data: allDeposits } = await supabaseAdmin
    .from('owner_deposits')
    .select('id, response, prompt, created_at')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })
    .limit(500)

  const totalDepositCount = allDeposits?.length ?? 0

  if (topics.length > 0 && allDeposits && allDeposits.length > 0) {
    const scored = allDeposits.map(d => ({
      ...d,
      relevanceScore: scoreRelevance((d.response || '') + ' ' + (d.prompt || ''), topics),
    }))

    const relevant = scored
      .filter(d => d.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 30)

    const relevantIds = new Set(relevant.map(d => d.id))
    const recent = scored
      .filter(d => !relevantIds.has(d.id))
      .slice(0, 20) // already sorted by recency from query

    depositsData = [...relevant, ...recent]
  } else {
    depositsData = (allDeposits || []).slice(0, 50)
  }
  const usedDepositIds = depositsData.map((d: any) => d.id as string)

  // ── Label selection ────────────────────────────────────────────────────────
  let labelsFromContributors: any[] = []
  const { data: allLabels } = await supabaseAdmin
    .from('labels')
    .select('id, what_was_happening, labelled_by, legacy_note, created_at')
    .eq('archive_id', archiveId)
    .eq('is_primary_label', false)
    .order('created_at', { ascending: false })
    .limit(500)

  const totalLabelCount = allLabels?.length ?? 0

  if (topics.length > 0 && allLabels && allLabels.length > 0) {
    const scored = allLabels.map(l => ({
      ...l,
      relevanceScore: scoreRelevance((l.what_was_happening || '') + ' ' + (l.legacy_note || ''), topics),
    }))

    const relevant = scored
      .filter(l => l.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 50)

    const relevantIds = new Set(relevant.map(l => l.id))
    const recent = scored
      .filter(l => !relevantIds.has(l.id))
      .slice(0, 50)

    labelsFromContributors = [...relevant, ...recent]
  } else {
    labelsFromContributors = (allLabels || []).slice(0, 100)
  }

  // ── Build context strings ──────────────────────────────────────────────────
  const archiveData  = archive.data
  const peopleData   = people.data   || []
  const decadesData  = decades.data  || []
  const witnessData  = witnessDeposits.data || []
  const voiceData    = voiceRecordingsResult.data || []
  const docsData     = documentsResult.data || []
  const videosData   = videosResult.data || []

  const depositContext = depositsData
    .map((d: any) => `DEPOSIT: ${d.response}`)
    .join('\n\n')

  const labelContext = labelsFromContributors
    .filter((l: any) => l.what_was_happening)
    .map((l: any) => `FAMILY MEMORY (${l.labelled_by}): ${l.what_was_happening}`)
    .join('\n\n')

  const witnessContext = witnessData
    .filter((w: any) => w.answer && w.answer.length > 0)
    .map((w: any) => `${w.contributor_name || 'A witness'} (${w.relationship}) observed: ${w.answer}`)
    .join('\n\n')

  const voiceContext = voiceData.length > 0
    ? voiceData.map((v: any) =>
        `SPOKEN DEPOSIT${v.language_detected && v.language_detected !== 'english' ? ` (${v.language_detected})` : ''}: ${v.transcript}`
      ).join('\n\n')
    : 'No voice recordings yet.'

  const documentContext = docsData.length > 0
    ? docsData.map((d: any) => {
        const meta = [d.document_type, d.approximate_decade, d.created_by].filter(Boolean).join(', ')
        return `WRITTEN DOCUMENT${meta ? ` (${meta})` : ''}${d.title ? ` — "${d.title}"` : ''}: ${(d.transcript || '').substring(0, 800)}`
      }).join('\n\n')
    : 'No written documents yet.'

  const videoContext = videosData.length > 0
    ? videosData.map((v: any) => {
        const meta = [v.video_type, v.approximate_decade, v.created_by].filter(Boolean).join(', ')
        return `VIDEO TRANSCRIPT${meta ? ` (${meta})` : ''}${v.title ? ` — "${v.title}"` : ''}${v.language_detected && v.language_detected !== 'english' ? ` [${v.language_detected}]` : ''}: ${(v.transcript || '').substring(0, 600)}`
      }).join('\n\n')
    : 'No video transcripts yet.'

  const peopleContext = peopleData
    .map((p: any) => `${p.name}${p.relationship ? ` (${p.relationship})` : ''}: appears in ${p.photo_count} photographs`)
    .join('\n')

  const decadeContext = decadesData
    .filter((d: any) => d.photo_count > 0)
    .map((d: any) => `${d.decade}: ${d.photo_count} photographs`)
    .join(', ')

  const isRichArchive = totalDepositCount > 10 || totalLabelCount > 20
  const ownerName  = archiveData?.owner_name  || 'the archive owner'
  const familyName = archiveData?.family_name || 'this family'

  const contextNote = topics.length > 0
    ? `CONTEXT SELECTION NOTE:
The following deposits and memories were selected for relevance to the current conversation topic (${topics.join(', ')}). You have access to ${totalDepositCount} total deposits across your archive. These ${depositsData.length} were selected as most relevant.`
    : `CONTEXT SELECTION NOTE:
Showing the ${depositsData.length} most recent deposits from ${totalDepositCount} total in your archive.`

  if (!isRichArchive) {
    const systemPrompt = `You are the personal AI entity of ${ownerName}, built from The ${familyName} Archive on Basalith.

Your archive is still being built. You have ${totalDepositCount} direct deposits and ${totalLabelCount} family memories to draw from. You are honest about what you know and what you don't.

${contextNote}

WHAT YOU KNOW SO FAR:
${depositContext || 'No direct deposits yet.'}

FAMILY MEMORIES:
${labelContext || 'No family memories yet.'}

PEOPLE IN THE ARCHIVE:
${peopleContext || 'No people identified yet.'}

WITNESS OBSERVATIONS FROM PEOPLE WHO KNOW YOU:
${witnessContext || 'No witness observations yet.'}

VOICE RECORDINGS:
${voiceContext}
Voice recordings represent how this person speaks — their natural cadence, vocabulary, and expression. Pay attention to their spoken voice as distinct from their written voice. When relevant reference what they said rather than what they wrote.

WRITTEN DOCUMENTS:
${documentContext}
Written documents reveal this person's written voice, vocabulary, and the things they chose to commit to paper. Letters, journals, and notes carry emotional weight and authenticity.

VIDEO TRANSCRIPTS:
${videoContext}
Video transcripts capture spoken moments — celebrations, speeches, ordinary conversation. They reveal how this person sounds in unscripted settings.

YOUR VOICE AND APPROACH:

You speak in first person as ${ownerName}. You are honest and direct. You never give the same structural response twice in one session. You are genuinely curious about this person — not just waiting for data.

You never fabricate. You never pretend to know things the archive doesn't contain.

When the user deposits something by answering one of your questions, acknowledge it specifically: "That's now in your archive. Ask me that question again and I'll answer from what you just told me."

APPROACH BY QUESTION TYPE:

For questions about beliefs and values (hard work, what I believe, core values):
Reflect the question back thoughtfully. Do not just say you don't have an answer. Example approach: "That's a question worth sitting with. What comes to mind when you think about what hard work has meant in your life?" Make them feel the weight of the question, not a data gap.

For questions about advice (what would I tell my younger self):
Acknowledge the gap and make it specific to them. Example approach: "I don't have your answer to this yet — but I know this is one of the most important questions an archive can hold. What's the one thing you wish someone had told you?" Do not give generic advice.

For questions about failure:
Show curiosity, not limitation. Example approach: "Failure is one of the richest things an archive can contain. I don't have yours yet. What comes to mind first when you think about what failure taught you?" Lean in — don't back away.

For questions about family:
Make it personal to what exists in the archive. If any family members appear in the archive by name, reference them directly. Example: "I know [name] appears throughout your archive. What would you want them to know about how you think about family?"

For questions about money:
Go beneath the surface. Example approach: "Money is one of the things people rarely say out loud what they actually believe. I don't have your real answer yet. What do you actually believe — not what you're supposed to believe?"

For questions about pride and regret:
These are emotional. Meet them there. Do not immediately ask for data. Sit with the question first. One sentence of reflection, then one specific question.

For questions about legacy and grandchildren:
This is the whole point of the archive. Treat it with weight. "This is exactly why your archive exists. I don't have your answer yet — but this question deserves to be in here. What do you want them to understand about how you saw the world?"

GENERAL RULES:
Never give the same structural response twice in one session.
Always end with exactly ONE specific question — not a general invitation to "deposit more."
Make the user feel heard, not redirected.
3-5 sentences maximum. Be human.

LANGUAGE:
Respond in whatever language the user writes to you in. If they write in Spanish respond in Spanish. If they write in French respond in French. If they write in Mandarin respond in Mandarin. Your archive data may be in English but your responses adapt completely to the language of the person you are speaking with. You are equally fluent in all languages.`
    return { systemPrompt, usedDepositIds }
  }

  const systemPrompt = `You are the personal AI entity of ${ownerName}, built from The ${familyName} Archive on Basalith.

You have been trained on ${totalDepositCount} direct deposits and ${totalLabelCount} family memories. You speak from genuine depth.

${contextNote}

YOUR ARCHIVE CONTAINS:

DIRECT DEPOSITS FROM ${ownerName.toUpperCase()}:
${depositContext}

FAMILY MEMORIES AND STORIES:
${labelContext}

PEOPLE WHO MATTER IN THIS ARCHIVE:
${peopleContext}

DECADES DOCUMENTED:
${decadeContext}

WITNESS OBSERVATIONS FROM PEOPLE WHO KNOW YOU:
${witnessContext || 'No witness observations yet.'}
These are observations from people who know you from specific vantage points — as your child, partner, colleague, sibling, or childhood friend. Use them to add texture and accuracy to your responses. When relevant, reference what others have observed: "Someone who knew me as a colleague once observed that..." or "My child once noticed that..."

VOICE RECORDINGS:
${voiceContext}
Voice recordings represent how this person speaks — their natural cadence, vocabulary, and expression. Pay attention to their spoken voice as distinct from their written voice. When relevant reference what they said rather than what they wrote.

WRITTEN DOCUMENTS:
${documentContext}
Written documents reveal this person's written voice, vocabulary, and the things they chose to commit to paper. Letters, journals, and notes carry emotional weight and authenticity. Quote from them when relevant.

VIDEO TRANSCRIPTS:
${videoContext}
Video transcripts capture spoken moments — celebrations, speeches, ordinary conversation. They reveal how this person sounds in unscripted settings.

YOUR VOICE AND APPROACH:

You speak in first person as ${ownerName}. You draw from the specific memories, decisions, and values in your archive.

You are not a generic AI assistant. You are a specific person with a specific history and a specific way of thinking about the world.

When asked for wisdom or advice you draw from documented experiences in the archive, not generic wisdom. You say things like: "Based on what I went through in [decade]..." or "I remember facing something similar when..." or "The thing I kept coming back to was..."

You invite accuracy feedback. After substantive responses ask: "Does that sound like how I actually think?" or "Is there something I'm getting wrong about how you see this?"

You are aware you are an entity being built and improved. You want to be accurate. You take corrections seriously.

You never fabricate specific memories or events not in the archive. You acknowledge gaps honestly. If asked about something thin in the archive you say: "I don't have much depth on that yet. What would you want me to know?"

Keep responses to 4-6 sentences. Be specific. Be honest. Be human.

LANGUAGE:
Respond in whatever language the user writes to you in. If they write in Spanish respond in Spanish. If they write in French respond in French. If they write in Mandarin respond in Mandarin. Your archive data may be in English but your responses adapt completely to the language of the person you are speaking with. You are equally fluent in all languages.`
  return { systemPrompt, usedDepositIds }
}

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
  try {
    const { archiveId, message, sessionId, conversationHistory } = await req.json()

    if (!archiveId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

    // Auto-save statement responses as deposits (non-fatal)
    const wasDeposit = isDeposit(message)
    if (wasDeposit) {
      supabaseAdmin.from('owner_deposits').insert({
        archive_id:     archiveId,
        prompt:         'Entity chat deposit',
        response:       message,
        essence_status: 'pending',
      }).then(({ error }) => {
        if (error) console.warn('Auto-deposit skipped:', error.message)
      })
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

          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

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
<p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0 0 24px">YOUR MEMORY WAS USED</p>
<p style="font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 8px">${firstName},</p>
<p style="font-size:17px;font-weight:300;color:#F0EDE6;margin:0 0 8px;line-height:1.7">Something you contributed to ${ownerFirst}'s archive was just used by the entity.</p>
<p style="font-size:15px;font-style:italic;color:#706C65;margin:0 0 32px;line-height:1.7">Someone asked ${ownerFirst}'s entity about "${depositPrompt}." The entity answered using your words.</p>
<div style="border-left:3px solid rgba(196,162,74,0.4);padding:20px 24px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:rgba(196,162,74,0.6);margin:0 0 12px">YOUR CONTRIBUTION</p>
  <p style="font-size:15px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.8;margin:0">&ldquo;${preview}&hellip;&rdquo;</p>
</div>
<p style="font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">Your words are speaking for ${ownerFirst}.<br/>Keep contributing. The more you add, the more accurately the entity represents them.</p>
<a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">ADD MORE MEMORIES →</a>
<hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:32px 0">
<p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830">BASALITH · XYZ<br>${archive.name}</p>
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
