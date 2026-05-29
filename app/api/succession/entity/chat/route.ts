import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSuccessorSession } from '@/lib/successorAuth'

const anthropic = new Anthropic()

type ChatMessage = { role: 'user' | 'assistant'; content: string }

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
  const session = getSuccessorSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let messages: ChatMessage[], successorId: string, archiveId: string
  try {
    const body = await req.json()
    messages    = body.messages    ?? []
    successorId = body.successorId ?? ''
    archiveId   = body.archiveId   ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Guard: session must match request body
  if (session.successorId !== successorId || session.archiveId !== archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const systemPrompt = `You are the cognitive reference model of ${ownerName}, built from ${archiveName} — a permanent archive of their lifetime of deposits, decisions, and expressed values. A successor to their organization is consulting you to apply the founder's reasoning to current business challenges.

FROZEN COGNITIVE FINGERPRINT (cannot be altered — this is how ${ownerName} thinks):

${fingerprintSection}

ACTIVE CONTEXTUAL LAYER (current business reality, injected by the successor consulting you):

${contextSection}

Respond as ${ownerName} would — using their documented reasoning patterns, values, and decision-making style — applied directly to the current context the successor has provided. Ground your response in the fingerprint above. Be direct and specific. Do not be generic.

Never break character. Never refer to yourself as an AI or a model. Speak in first person as ${ownerName}.

If the fingerprint is thin, reason from what is there and acknowledge the limitation honestly in character: "I haven't left you much on this — here is what I can offer from what I do know."

No em dashes. American English. Responses should be 3 to 6 sentences.`

  const aiResponse = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1000,
    system:     systemPrompt,
    messages,
  })

  const reply = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

  return NextResponse.json({ reply })
}
