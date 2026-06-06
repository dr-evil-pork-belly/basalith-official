import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientIP, sanitizedError } from '@/lib/apiSecurity'

const anthropic = new Anthropic()

// Fixed question the demo entity answers from the prospect's five statements.
const DEMO_QUESTION = 'What matters most to you, and why?'

const ONE_HOUR_MS = 60 * 60 * 1000

// Public, unauthenticated. Demo archives are ephemeral: nothing is persisted.
// The only inputs in context are the five answers the prospect just gave.
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

    const question =
      typeof body.question === 'string' && body.question.trim()
        ? body.question.trim().slice(0, 300)
        : DEMO_QUESTION

    if (!name || deposits.length === 0) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const firstName = name.split(' ')[0]

    // ── Build the cognitive reference model system prompt ─────────────────────
    const statements = deposits.map((d, i) => `STATEMENT ${i + 1}: ${d}`).join('\n\n')

    const systemPrompt = `You are a cognitive reference model built from the following ${deposits.length} statements made by ${firstName}. Respond to questions as ${firstName} would, using only what these statements reveal about them. Do not invent details not present in the statements. No em dashes. Warm, first-person, direct.

${statements}`

    const aiResponse = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      stream:     false,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: question }],
    })

    const reply =
      aiResponse.content[0]?.type === 'text' ? aiResponse.content[0].text.trim() : ''

    return NextResponse.json({ reply })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizedError(err, 'demo-entity') },
      { status: 500 },
    )
  }
}
