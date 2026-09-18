import { NextRequest, NextResponse, after } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { verifyGrounding, groundingGapReply } from '@/lib/verifyGrounding'
import { logGroundingGap } from '@/lib/groundingGapLog'
import { buildEntitySystemPrompt, formatFingerprintSection, EMPTY_CONTEXT } from '@/lib/entitySystemPrompt'
import { selectFrozenLayer, describeSelection, FROZEN_LAYER_CANDIDATE_LIMIT } from '@/lib/frozenLayer'

const anthropic = new Anthropic()

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// A client message's content may arrive as a plain string or as an array of
// content blocks. Coerce to the text string before passing to the verifier.
function messageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(block =>
        block && typeof block === 'object' && 'text' in block &&
        typeof (block as { text: unknown }).text === 'string'
          ? (block as { text: string }).text
          : ''
      )
      .join('')
  }
  return ''
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function labelContextType(raw: string): string {
  const map: Record<string, string> = {
    business_update:      'Business Update',
    market_condition:     'Market Condition',
    organizational_change: 'Organizational Change',
    strategic_decision:   'Strategic Decision',
    other:                'Context Update',
  }
  return map[raw] ?? 'Context Update'
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.successorId || !session.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const successorId = session.successorId
  const archiveId    = session.archiveId

  let messages: ChatMessage[]
  try {
    const body = await req.json()
    messages = body.messages ?? []
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // The whole included corpus, in quality order, is the candidate set. The
  // frozen layer the entity sees is selected from it per question below. Until
  // 2026-09-10 this query ended in .limit(20), which sent the same twenty rows
  // to every question regardless of topic. See lib/frozenLayer.ts.
  const [archiveResult, trainingResult, contextsResult] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('name, owner_name')
      .eq('id', archiveId)
      .single(),
    supabaseAdmin
      .from('training_pairs')
      .select('id, prompt, completion')
      .eq('archive_id', archiveId)
      .eq('included_in_training', true)
      .order('quality_score', { ascending: false })
      // quality_score is an integer, so ties are the common case. The second
      // key makes the candidate order reproducible across turns, which is what
      // lets the retriever's prompt cache hit.
      .order('id', { ascending: true })
      .limit(FROZEN_LAYER_CANDIDATE_LIMIT),
    supabaseAdmin
      .from('successor_contexts')
      .select('content, context_type, created_at')
      .eq('successor_id', successorId)
      .order('created_at', { ascending: false }),
  ])

  const archive    = archiveResult.data
  const candidates = trainingResult.data ?? []
  const contexts   = contextsResult.data ?? []

  if (!archive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ownerName   = archive.owner_name ?? archive.name
  const archiveName = archive.name

  // The question is the last user turn. Earlier user turns ride along as
  // retrieval context only, so a follow-up still selects against the thread.
  const userTurns = messages
    .filter(m => m.role === 'user')
    .map(m => messageText(m.content))
  const lastUserMessage = userTurns[userTurns.length - 1] ?? ''
  const priorQuestions  = userTurns.slice(0, -1)

  // Select the frozen layer for THIS question. At or under the cap this returns
  // every pair with no model call. Over the cap it retrieves, and on any
  // retrieval failure it degrades to the pre-2026-09-10 quality-order layer.
  const selection = await selectFrozenLayer({ question: lastUserMessage, priorQuestions, candidates })
  const pairs     = selection.pairs
  console.log(`[succession-entity] ${archiveId} ${describeSelection(selection)}`)

  const fingerprintSection = formatFingerprintSection(pairs)

  const contextSection = contexts.length > 0
    ? contexts.map(c =>
        `[${labelContextType(c.context_type)}, ${formatDate(c.created_at)}]:\n${c.content}`
      ).join('\n\n')
    : EMPTY_CONTEXT

  const systemPrompt = buildEntitySystemPrompt({ ownerName, archiveName, fingerprintSection, contextSection })

  const aiResponse = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1000,
    system:     systemPrompt,
    messages,
  })

  let reply = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

  // Control B, output-side grounding verifier. The whole draft is in hand here
  // (non-streamed), so audit it before it ships. If the draft commits a founder
  // position the frozen deposits do not directly support, replace it with the
  // templated honest gap rather than putting words in the founder's mouth.
  //
  // `pairs` is the SAME selected layer the entity was shown, not the whole
  // corpus. "Checked against the archive" therefore describes exactly what the
  // entity had in front of it.
  const verdict = await verifyGrounding({ pairs, question: lastUserMessage, answer: reply })

  // Grounding gap log (Slice A). Every non-'deposit' verdict is a question the
  // frozen archive could not ground: both 'unsupported' (draft overreached and
  // is replaced below) and 'no_position' (the entity declined in its own words,
  // reply left as-is).
  //
  // after() is load-bearing here, NOT style. It defers the write until after
  // the response is sent while keeping the serverless instance alive until the
  // promise settles. A bare `void` dispatch dies on lambda freeze the moment
  // the response resolves: the RPC never executes and the gap is silently lost
  // (this is exactly what left the prod table empty across writing-eligible
  // turns). The write still never affects the reply, its status, or its latency,
  // and every failure stays swallowed inside logGroundingGap.
  if (verdict.basis !== 'deposit') {
    // Capture the narrowed basis: TypeScript drops the `!== 'deposit'` narrowing
    // inside the deferred after() closure, so bind it to a const here first.
    const basis = verdict.basis
    after(() => logGroundingGap({ archiveId, question: lastUserMessage, basis }))
  }

  if (verdict.supported === false) {
    reply = groundingGapReply(verdict.topic)
  }

  return NextResponse.json({ reply })
}
