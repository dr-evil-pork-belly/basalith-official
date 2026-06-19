import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { verifyGrounding, groundingGapReply } from '@/lib/verifyGrounding'
import { buildEntitySystemPrompt } from '@/lib/entitySystemPrompt'

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

  const [archiveResult, trainingResult, contextsResult] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('name, owner_name')
      .eq('id', archiveId)
      .single(),
    supabaseAdmin
      .from('training_pairs')
      .select('prompt, completion')
      .eq('archive_id', archiveId)
      .eq('included_in_training', true)
      .order('quality_score', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('successor_contexts')
      .select('content, context_type, created_at')
      .eq('successor_id', successorId)
      .order('created_at', { ascending: false }),
  ])

  const archive  = archiveResult.data
  const pairs    = trainingResult.data ?? []
  const contexts = contextsResult.data ?? []

  if (!archive) {
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  }

  const ownerName   = archive.owner_name ?? archive.name
  const archiveName = archive.name

  const fingerprintSection = pairs.length > 0
    ? pairs.map(p => `Q: ${p.prompt}\nA: ${p.completion}`).join('\n\n')
    : 'No training data available yet.'

  const contextSection = contexts.length > 0
    ? contexts.map(c =>
        `[${labelContextType(c.context_type)} — ${formatDate(c.created_at)}]:\n${c.content}`
      ).join('\n\n')
    : 'No contextual layer injected yet.'

  const systemPrompt = buildEntitySystemPrompt({ ownerName, archiveName, fingerprintSection, contextSection })

  const aiResponse = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1000,
    system:     systemPrompt,
    messages,
  })

  let reply = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

  // Control B — output-side grounding verifier. The whole draft is in hand here
  // (non-streamed), so audit it before it ships. If the draft commits a founder
  // position the frozen deposits do not directly support, replace it with the
  // templated honest gap rather than putting words in the founder's mouth.
  const lastUserMessage = messageText(
    [...messages].reverse().find(m => m.role === 'user')?.content
  )
  const verdict = await verifyGrounding({ pairs, question: lastUserMessage, answer: reply })
  if (verdict.supported === false) {
    reply = groundingGapReply(verdict.topic)
  }

  return NextResponse.json({ reply })
}
