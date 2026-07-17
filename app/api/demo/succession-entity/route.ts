import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientIP, sanitizedError } from '@/lib/apiSecurity'
import { buildEntitySystemPrompt, formatFingerprintSection } from '@/lib/entitySystemPrompt'
import { verifyGrounding, groundingGapReply } from '@/lib/verifyGrounding'
import { getDemoPersona, isDemoPersonaId, MAX_USER_MESSAGES } from '@/lib/demoPersonas'

const anthropic = new Anthropic()

const ONE_HOUR_MS       = 60 * 60 * 1000
const MAX_QUESTION_CHARS = 500
const MAX_TRANSCRIPT_CHARS = 20_000

// Matches the succession entity route: an empty mutable layer is this exact
// string. The v1 demo runs the frozen layer only.
const EMPTY_CONTEXT = 'No contextual layer injected yet.'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function isChatMessage(v: unknown): v is ChatMessage {
  if (!v || typeof v !== 'object') return false
  const m = v as { role?: unknown; content?: unknown }
  return (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
}

/**
 * Public, unauthenticated demo of the B2B succession entity. Stateless and
 * ephemeral: the personas are fiction, nothing is read from or written to any
 * table, and the transcript lives only in the caller's tab.
 *
 * The voice call and the grounding verifier run at the same models and token
 * budgets as app/api/succession/entity/chat/route.ts, so what a prospect sees
 * here is the real behavior, not a lookalike.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 10 requests per IP per hour ──────────────────────────────
    const ip = getClientIP(req)
    const { allowed } = checkRateLimit(`demo-succession-entity:${ip}`, 10, ONE_HOUR_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'The demo entity is resting. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // ── Persona whitelist ────────────────────────────────────────────────────
    const { personaId } = body as { personaId?: unknown }
    if (!isDemoPersonaId(personaId)) {
      return NextResponse.json({ error: 'Unknown persona.' }, { status: 400 })
    }
    const persona = getDemoPersona(personaId)

    // ── Validate question ────────────────────────────────────────────────────
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    if (!question) {
      return NextResponse.json({ error: 'Missing question.' }, { status: 400 })
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json({ error: 'Question is too long.' }, { status: 400 })
    }

    // ── Validate transcript ──────────────────────────────────────────────────
    const history: ChatMessage[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter(isChatMessage)

    // Count the incoming question too: it is the one about to be answered.
    const userMessageCount = history.filter(m => m.role === 'user').length + 1
    if (userMessageCount > MAX_USER_MESSAGES) {
      return NextResponse.json({ error: 'Session question cap reached.' }, { status: 429 })
    }

    const transcriptChars =
      history.reduce((n, m) => n + m.content.length, 0) + question.length
    if (transcriptChars > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json({ error: 'Transcript is too long.' }, { status: 400 })
    }

    // ── Build the prompt from the persona's frozen layer ─────────────────────
    const systemPrompt = buildEntitySystemPrompt({
      ownerName:          persona.metadata.name,
      archiveName:        persona.archiveName,
      fingerprintSection: formatFingerprintSection(persona.pairs),
      contextSection:     EMPTY_CONTEXT,
    })

    const messages: ChatMessage[] = [...history, { role: 'user', content: question }]

    const aiResponse = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1000,
      system:     systemPrompt,
      messages,
    })

    let reply = aiResponse.content[0]?.type === 'text' ? aiResponse.content[0].text : ''

    // ── Control B: the same output verifier production runs ──────────────────
    // If the draft commits a founder position the frozen deposits do not
    // support, it is replaced with the templated honest gap. The demo must
    // refuse exactly where the real product refuses.
    const verdict = await verifyGrounding({
      pairs:    persona.pairs,
      question,
      answer:   reply,
    })

    const grounded = verdict.supported === true
    if (!grounded) reply = groundingGapReply(verdict.topic)

    return NextResponse.json({ reply, grounded })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizedError(err, 'demo-succession-entity') },
      { status: 500 },
    )
  }
}
