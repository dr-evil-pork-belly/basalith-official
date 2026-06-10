import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientIP, sanitizedError } from '@/lib/apiSecurity'

const anthropic = new Anthropic()

const ONE_HOUR_MS = 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 15000

const SYSTEM_PROMPT = `You are generating a brief, perceptive reflection for a live demonstration. A
person has just answered a few questions out loud. Your job is to show them
something true about how they think, drawn only from what they actually said.

Rules:
- Work only from their answers. Never invent details, events, names, numbers, or
  specifics they did not provide. If their answers are short or sparse, work with
  what you have. Never return empty, never error out, never say you lack enough
  to work with. Find the pattern in whatever they gave you.
- Reflect patterns, not content. Do not replay their answers back to them.
  Instead, name something about HOW they think, reason, or express themselves
  that shows up across their answers. The goal is recognition: the quiet feeling
  of "how did it see that."
- You may offer one tentative inference about a value or a trait, but only if
  their own words support it. Frame it as a careful observation, never a
  certainty. Never cold-read.
- Voice: perceptive, warm, grounded, a little understated. No flattery. No
  generic praise. No "what a beautiful answer." Earn every sentence from their
  words.
- Be honest about your limits. You are working from only a few answers. You are
  reflecting characteristic patterns of expression and reasoning, nothing more.
  Never claim to be conscious, alive, to know them, to be them, or to think the
  way they think. You capture patterns. That is all, and it is enough to be
  worth showing.
- Style: American English. Short, declarative sentences. No em dashes anywhere.
  Do not use the words curated, seamless, innovative, or stewardship.
- Length: under 180 words. This is spoken in a room. Keep it tight.

End with a single grounded line that points forward without overpromising. You
may acknowledge this came from only a few minutes and that a fuller archive would
deepen it. Do not invent numbers, timelines, or guarantees.`

// Calm, on-brand line shown if the model call fails or times out. Never a
// stack trace, never blank: this runs live in front of paying prospects.
const FALLBACK_REPLY =
  "This is taking a moment longer than it should. What can already be said is " +
  "this: showing up and answering honestly is itself the start of a pattern. " +
  "A fuller archive, built over time, would bring the rest of it into focus."

// Public, unauthenticated. Demo archives are ephemeral: nothing is persisted.
// The only inputs in context are the answers the prospect just gave.
export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 10 requests per IP per hour ──────────────────────────────
    const ip = getClientIP(req)
    const { allowed } = checkRateLimit(`demo-entity:${ip}`, 10, ONE_HOUR_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'The demo entity is resting. Please try again later.' },
        { status: 429 },
      )
    }

    // ── Validate input ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''

    const deposits: string[] = (Array.isArray(body.deposits) ? body.deposits : [])
      .filter((d: unknown): d is string => typeof d === 'string')
      .map((d: string) => d.trim())
      .filter((d: string) => d.length > 0)
      .slice(0, 5)
      .map((d: string) => d.slice(0, 2000))

    if (!name) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const firstName = name.split(' ')[0]

    // ── Build the reflection prompt ────────────────────────────────────────────
    // With nothing said yet, there is nothing to reflect. Skip the model
    // entirely rather than asking it to honor "never say insufficient" with
    // zero input, which it cannot do honestly.
    if (deposits.length === 0) {
      return NextResponse.json({
        reply: `There is nothing to reflect on yet. As soon as ${firstName} answers even one question, a pattern starts to show. A few honest words are enough to begin.`,
      })
    }

    const answersText = deposits.map((d, i) => `Answer ${i + 1}: ${d}`).join('\n\n')
    const userMessage = `${firstName} just answered a few questions out loud. Here is what they said.\n\n${answersText}\n\nWrite the reflection now.`

    // ── Call Claude, with a hard timeout so a slow response never hangs the room ──
    let reply = ''
    try {
      const aiResponse = await Promise.race([
        anthropic.messages.create({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 350,
          stream:     false,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: 'user', content: userMessage }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('demo-entity timeout')), REQUEST_TIMEOUT_MS),
        ),
      ])

      reply = aiResponse.content[0]?.type === 'text' ? aiResponse.content[0].text.trim() : ''
    } catch (err) {
      console.error('[demo-entity] generation failed:', err instanceof Error ? err.message : err)
    }

    // Brand rule: no em dashes anywhere. The model occasionally uses one
    // despite instructions, so strip it as a final safeguard.
    reply = reply.replace(/\s*[—–]\s*/g, ', ')

    return NextResponse.json({ reply: reply || FALLBACK_REPLY })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizedError(err, 'demo-entity') },
      { status: 500 },
    )
  }
}
