import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const VALID_INTENTS = ['general', 'pricing', 'partner', 'press'] as const
type Intent = typeof VALID_INTENTS[number]

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, email, message, intent } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ ok: false, error: 'Name is required.' }, { status: 422 })
  }

  if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
    return NextResponse.json({ ok: false, error: 'A valid email address is required.' }, { status: 422 })
  }

  const cleanIntent: Intent | null =
    intent && typeof intent === 'string' && VALID_INTENTS.includes(intent as Intent)
      ? (intent as Intent)
      : null

  const { error } = await supabaseAdmin.from('contact_requests').insert([
    {
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      message: message && typeof message === 'string' ? message.trim() || null : null,
      intent:  cleanIntent,
    },
  ])

  if (error) {
    console.error('[contact] Supabase insert error:', error.message)
    return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
