import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { classifyDeposit } from '@/lib/classifyDeposit'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

function milestoneStage(depositCount: number): string {
  if (depositCount < 10)  return `Building the archive (${depositCount} memories so far)`
  if (depositCount < 50)  return 'The Echo Layer. Your entity echoes you back.'
  if (depositCount < 200) return 'The Wisdom Compass. Your entity reflects how you reason.'
  if (depositCount < 500) return 'The Full Portrait. Your entity captures what shapes your judgment.'
  return 'The Cognitive Fingerprint. Your entity sounds like you.'
}

// The Guide can save real archive material it hears in conversation.
const SAVE_DEPOSIT_TOOL: Anthropic.Tool = {
  name: 'save_deposit',
  description:
    "Save a meaningful piece of the user's memory, knowledge, or reflection to their archive. " +
    'Call this when the user shares something worth preserving and asks to save it, or agrees ' +
    'when you offer to save it. Only save genuine archive material the user has actually shared ' +
    'in this conversation.',
  input_schema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: "The user's own words / memory to preserve, captured faithfully" },
      topic:   { type: 'string', description: 'A short prompt or question this content answers, e.g. "Daily routine cooking with the kids"' },
    },
    required: ['content', 'topic'],
  },
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

    const [archiveResult, depositCountResult] = await Promise.all([
      supabaseAdmin
        .from('archives')
        .select('current_streak, name, owner_name')
        .eq('id', archiveId)
        .single(),
      supabaseAdmin
        .from('owner_deposits')
        .select('*', { count: 'exact', head: true })
        .eq('archive_id', archiveId),
    ])

    const streak       = (archiveResult.data?.current_streak ?? 0) as number
    const archiveName  = (archiveResult.data?.name ?? context?.archiveName ?? 'this archive') as string
    const ownerName    = (archiveResult.data?.owner_name ?? context?.ownerName ?? 'the archive owner') as string
    const language     = context?.language ?? 'en'
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
- American English throughout.

Saving to the archive:
You can save meaningful things the user shares to their archive using the save_deposit tool. When someone shares a real memory, routine, value, or piece of knowledge, you may offer to save it. Only confirm something is saved AFTER the save_deposit tool has actually run. Never claim to have saved something you did not save through the tool.`

    const baseMessages: Anthropic.MessageParam[] = messages.map(m => ({ role: m.role, content: m.content }))

    const first = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system:     systemPrompt,
      tools:      [SAVE_DEPOSIT_TOOL],
      messages:   baseMessages,
    })

    const toolUse = first.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'save_deposit',
    )

    // ── No save requested: return the text reply, same as before ──────────────
    if (!toolUse) {
      const textBlock = first.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
      return NextResponse.json({ reply: textBlock?.text ?? '' })
    }

    // ── Save requested: persist, then let Claude confirm truthfully ───────────
    const input   = (toolUse.input ?? {}) as { content?: string; topic?: string }
    const content = typeof input.content === 'string' ? input.content.trim() : ''
    const topic   = (typeof input.topic === 'string' && input.topic.trim()) || 'Companion conversation'

    let savedDepositId: string | null = null
    let toolResultText: string
    let toolResultIsError = false

    if (!content) {
      // Nothing real to save: tell the model so it does not falsely confirm.
      toolResultText   = 'No content was provided, so nothing was saved. Do not tell the user it was saved.'
      toolResultIsError = true
    } else {
      const { data: deposit, error } = await supabaseAdmin
        .from('owner_deposits')
        .insert({
          archive_id:  archiveId,
          prompt:      topic,
          response:    content,
          source_type: 'companion',
        })
        .select('id')
        .single()

      if (error || !deposit) {
        console.error('[companion] deposit save failed:', error?.message)
        toolResultText    = 'The save failed due to a system error. Do not tell the user it was saved.'
        toolResultIsError = true
      } else {
        savedDepositId = deposit.id as string

        // Domain classification — fire-and-forget
        void classifyDeposit({ depositId: savedDepositId, archiveId, text: content })

        // Training pair — awaited so it runs before the function returns, but
        // non-fatal: a failure here must not undo the save or block confirmation.
        try {
          await createTrainingPairFromDeposit(
            { id: savedDepositId, archive_id: archiveId, prompt: topic, response: content, source_type: 'companion' },
            ownerName,
            archiveName,
            language,
          )
        } catch (e) {
          console.warn('[companion] training pair failed:', e instanceof Error ? e.message : e)
        }

        toolResultText = `Saved to the archive. Deposit id: ${savedDepositId}. Confirm to the user warmly and briefly that it is now in their archive.`
      }
    }

    const followupMessages: Anthropic.MessageParam[] = [
      ...baseMessages,
      { role: 'assistant', content: first.content },
      {
        role:    'user',
        content: [
          {
            type:         'tool_result',
            tool_use_id:  toolUse.id,
            content:      toolResultText,
            is_error:     toolResultIsError,
          },
        ],
      },
    ]

    // No tools on the confirmation call: the save already happened, so force a
    // plain text reply rather than risk another tool_use producing empty text.
    const second = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system:     systemPrompt,
      messages:   followupMessages,
    })

    const secondText = second.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    const reply      = secondText?.text ?? ''

    if (savedDepositId) {
      return NextResponse.json({ reply, saved: true, depositId: savedDepositId })
    }
    return NextResponse.json({ reply })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[companion] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
