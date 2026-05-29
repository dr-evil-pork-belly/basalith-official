import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const FALLBACK = 'Tell me about a decision you made that surprised even you.'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { archiveId } = body as { archiveId?: string }

    if (!archiveId) {
      return NextResponse.json({ error: 'archiveId is required' }, { status: 400 })
    }

    const [archiveResult, depositsResult] = await Promise.all([
      supabaseAdmin
        .from('archives')
        .select('preferred_language, name')
        .eq('id', archiveId)
        .single(),
      supabaseAdmin
        .from('owner_deposits')
        .select('response')
        .eq('archive_id', archiveId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const recentSnippets = (depositsResult.data ?? [])
      .map(d => (d.response ?? '').substring(0, 40))
      .filter(Boolean)

    const avoidContext = recentSnippets.length > 0
      ? recentSnippets.join(' | ')
      : 'none'

    const aiResponse = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role:    'user',
        content: `Generate one unexpected memory prompt for someone building a personal legacy archive. Make it specific, surprising, and personal — not generic. Avoid topics similar to these recent entries: ${avoidContext}. Under 20 words. No em dashes. No quotation marks. Just the prompt.`,
      }],
    })

    const responseText = aiResponse.content[0].type === 'text'
      ? aiResponse.content[0].text.trim()
      : FALLBACK

    return NextResponse.json({ prompt: responseText })
  } catch (error: unknown) {
    console.error('[spark/random] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ prompt: FALLBACK })
  }
}
