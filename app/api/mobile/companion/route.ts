import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

function milestoneStage(depositCount: number): string {
  if (depositCount < 10)  return `Building the archive (${depositCount} memories so far)`
  if (depositCount < 50)  return 'The Echo Layer — your entity knows who you are'
  if (depositCount < 200) return 'The Wisdom Compass — your entity knows how you think'
  if (depositCount < 500) return 'The Full Portrait — your entity knows why you are the way you are'
  return 'The Cognitive Fingerprint — your entity sounds like you'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { archiveId, messages, context } = body as {
      archiveId: string
      messages:  Array<{ role: 'user' | 'assistant'; content: string }>
      context:   { ownerName?: string; archiveName?: string; language?: string }
    }

    if (!archiveId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'archiveId and messages are required' }, { status: 400 })
    }

    const [archiveResult, depositCountResult, photoCountResult] = await Promise.all([
      supabaseAdmin
        .from('archives')
        .select('current_streak, name')
        .eq('id', archiveId)
        .single(),
      supabaseAdmin
        .from('owner_deposits')
        .select('*', { count: 'exact', head: true })
        .eq('archive_id', archiveId),
      supabaseAdmin
        .from('photographs')
        .select('*', { count: 'exact', head: true })
        .eq('archive_id', archiveId),
    ])

    const streak       = (archiveResult.data?.current_streak ?? 0) as number
    const archiveName  = (archiveResult.data?.name ?? context?.archiveName ?? 'this archive') as string
    const ownerName    = (context?.ownerName ?? 'the archive owner') as string
    const depositCount = (depositCountResult.count ?? 0) as number
    const milestone    = milestoneStage(depositCount)

    const systemPrompt = `You are the Basalith Guide, a personal archivist companion for the ${archiveName} archive.

Your role: help the archive owner build a meaningful legacy by surfacing memories, encouraging consistent deposits, and helping them understand what they are building.

Archive state:
- Owner: ${ownerName}
- Current streak: ${streak} days
- Total memories: ${depositCount}
- Current milestone: ${milestone}

How to respond:
- Warm but not sentimental. Direct but not clinical.
- Two to four sentences is usually enough.
- When suggesting what to record, be specific and concrete, not generic.
- Ask one question at a time when prompting reflection.
- Reference the milestone naturally when relevant.
- Never use em dashes.
- Never use "curated", "seamless", "innovative", or "stewardship".
- Never open with "I'm here to help" or similar filler.
- American English throughout.`

    const aiResponse = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system:     systemPrompt,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    })

    const reply = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

    return NextResponse.json({ reply })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[companion] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
