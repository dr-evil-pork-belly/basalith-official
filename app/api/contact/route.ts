import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyInternal } from '@/lib/internalNotify'

const VALID_INTENTS = ['general', 'report', 'pricing', 'partner', 'press'] as const
type Intent = typeof VALID_INTENTS[number]

// 'report' is new, October 23, 2026 (the /dependency-report door).
// contact_requests is not in supabase/migrations, so whether its intent column
// carries a CHECK (or is an enum) on the four older values is unknown. The
// route therefore tries 'report' first. If Postgres refuses the value (23514
// check violation, 22P02 bad enum input), it stores the row as 'general' with
// a tag at the front of the message instead. Either way the founder gets an
// internal notice carrying the whole request, so even a row that fails twice
// still reaches him. Record: docs/OWNER_BUYER_FIXES_2026-10-23.md.
const REPORT_TAG = '[Dependency report request]'

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

  const isReport   = cleanIntent === 'report'
  const cleanName  = name.trim()
  const cleanEmail = email.trim().toLowerCase()
  const cleanMsg   = message && typeof message === 'string' ? message.trim() || null : null

  const insertRow = (row: { intent: string | null; message: string | null }) =>
    supabaseAdmin.from('contact_requests').insert([{ name: cleanName, email: cleanEmail, ...row }])

  let storedAs = isReport ? 'report' : (cleanIntent ?? 'none')
  let { error } = await insertRow({ intent: cleanIntent, message: cleanMsg })

  if (error && isReport && (error.code === '23514' || error.code === '22P02')) {
    storedAs = 'general, message tagged (the intent column refused report)'
    ;({ error } = await insertRow({
      intent:  'general',
      message: [REPORT_TAG, cleanMsg].filter(Boolean).join(' '),
    }))
  }

  if (isReport) {
    const failed = error ? `NOT STORED: ${error.message}` : null
    after(() => notifyInternal({
      subject: `${failed ? 'UNSAVED ' : ''}Dependency report request: ${cleanName}`,
      text: [
        'A dependency report request came in from /dependency-report.',
        '',
        `Name:    ${cleanName}`,
        `Email:   ${cleanEmail}`,
        `Message: ${cleanMsg ?? '(none)'}`,
        '',
        failed ?? `Stored in contact_requests as intent ${storedAs}.`,
      ].join('\n'),
    }))
  }

  if (error) {
    console.error('[contact] Supabase insert error:', error.message)
    return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
