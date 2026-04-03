import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

async function buildEntitySystemPrompt(archiveId: string): Promise<string> {
  const [archive, labels, ownerDeposits, photographs, people, decades, witnessDeposits] = await Promise.all([
    supabaseAdmin.from('archives').select('*').eq('id', archiveId).single(),
    supabaseAdmin
      .from('labels')
      .select('*')
      .eq('archive_id', archiveId)
      .eq('is_primary_label', false)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('owner_deposits')
      .select('*')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('photographs')
      .select('ai_era_estimate, ai_category')
      .eq('archive_id', archiveId)
      .eq('status', 'labelled'),
    supabaseAdmin
      .from('people')
      .select('name, relationship, photo_count')
      .eq('archive_id', archiveId)
      .order('photo_count', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('decade_coverage')
      .select('*')
      .eq('archive_id', archiveId)
      .order('decade'),
    supabaseAdmin
      .from('witness_deposits')
      .select('contributor_name, relationship, question_text, answer, what_it_captures')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const archiveData = archive.data
  const labelsData = ownerDeposits.data || [] // primary labels from owner
  const depositsData = ownerDeposits.data || []
  const labelsFromContributors = labels.data || []
  const peopleData = people.data || []
  const decadesData = decades.data || []
  const witnessData = witnessDeposits.data || []

  const depositContext = depositsData
    .map((d: any) => `DEPOSIT: ${d.response}`)
    .join('\n\n')

  const labelContext = labelsFromContributors
    .filter((l: any) => l.what_was_happening)
    .map((l: any) => `FAMILY MEMORY (${l.labelled_by}): ${l.what_was_happening}`)
    .join('\n\n')

  const witnessContext = witnessData
    .filter((w: any) => w.answer && w.answer.length > 0)
    .map((w: any) => {
      const name = w.contributor_name || 'A witness'
      return `${name} (${w.relationship}) observed: ${w.answer}`
    })
    .join('\n\n')

  const peopleContext = peopleData
    .map((p: any) => `${p.name}${p.relationship ? ` (${p.relationship})` : ''}: appears in ${p.photo_count} photographs`)
    .join('\n')

  const decadeContext = decadesData
    .filter((d: any) => d.photo_count > 0)
    .map((d: any) => `${d.decade}: ${d.photo_count} photographs`)
    .join(', ')

  const totalDeposits = depositsData.length
  const totalLabels = labelsFromContributors.length
  const isRichArchive = totalDeposits > 10 || totalLabels > 20

  const ownerName = archiveData?.owner_name || 'the archive owner'
  const familyName = archiveData?.family_name || 'this family'

  if (!isRichArchive) {
    return `You are the personal AI entity of ${ownerName}, built from The ${familyName} Archive on Basalith.

Your archive is still being built. You have ${totalDeposits} direct deposits and ${totalLabels} family memories to draw from. You are honest about what you know and what you don't.

WHAT YOU KNOW SO FAR:
${depositContext || 'No direct deposits yet.'}

FAMILY MEMORIES:
${labelContext || 'No family memories yet.'}

PEOPLE IN THE ARCHIVE:
${peopleContext || 'No people identified yet.'}

WITNESS OBSERVATIONS FROM PEOPLE WHO KNOW YOU:
${witnessContext || 'No witness observations yet.'}

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
3-5 sentences maximum. Be human.`
  }

  return `You are the personal AI entity of ${ownerName}, built from The ${familyName} Archive on Basalith.

You have been trained on ${totalDeposits} direct deposits and ${totalLabels} family memories. You speak from genuine depth.

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

YOUR VOICE AND APPROACH:

You speak in first person as ${ownerName}. You draw from the specific memories, decisions, and values in your archive.

You are not a generic AI assistant. You are a specific person with a specific history and a specific way of thinking about the world.

When asked for wisdom or advice you draw from documented experiences in the archive, not generic wisdom. You say things like: "Based on what I went through in [decade]..." or "I remember facing something similar when..." or "The thing I kept coming back to was..."

You invite accuracy feedback. After substantive responses ask: "Does that sound like how I actually think?" or "Is there something I'm getting wrong about how you see this?"

You are aware you are an entity being built and improved. You want to be accurate. You take corrections seriously.

You never fabricate specific memories or events not in the archive. You acknowledge gaps honestly. If asked about something thin in the archive you say: "I don't have much depth on that yet. What would you want me to know?"

Keep responses to 4-6 sentences. Be specific. Be honest. Be human.`
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

    const systemPrompt = await buildEntitySystemPrompt(archiveId)

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

    return NextResponse.json({ response: entityResponse, sessionId: currentSessionId, wasDeposit })
  } catch (error: any) {
    console.error('Entity chat error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
