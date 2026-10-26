import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyInternal } from '@/lib/internalNotify'

const VALID_INTENTS = ['general', 'report', 'succession', 'acquisition', 'pricing', 'partner', 'press'] as const
type Intent = typeof VALID_INTENTS[number]

// 'report' (October 23, 2026, the /dependency-report door), 'succession' and
// 'acquisition' (October 25, every business button on the site, since /apply is
// no longer linked) are newer than the contact_requests table, which is not in
// supabase/migrations, so whether its intent column carries a CHECK (or is an
// enum) on the four older values is unknown. The route tries the new value
// first. If Postgres refuses it (23514 check violation, 22P02 bad enum input),
// it stores the row as 'general' with a tag at the front of the message. Either
// way the founder gets an internal email carrying the whole request, so a lead
// that fails both inserts still reaches him.
// Records: docs/OWNER_BUYER_FIXES_2026-10-23.md, docs/NICHE_PASS_2026-10-25.md.
const NEW_INTENTS = new Set<Intent>(['report', 'succession', 'acquisition'])
const TAGS: Record<string, string> = {
  report:      '[Dependency report request]',
  succession:  '[Succession inquiry]',
  acquisition: '[Acquisition inquiry]',
}
const SUBJECTS: Record<string, string> = {
  report:      'Dependency report request',
  succession:  'Succession inquiry',
  acquisition: 'Acquisition inquiry',
}

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

  const isNew      = cleanIntent !== null && NEW_INTENTS.has(cleanIntent)
  const cleanName  = name.trim()
  const cleanEmail = email.trim().toLowerCase()
  const cleanMsg   = message && typeof message === 'string' ? message.trim() || null : null

  const insertRow = (row: { intent: string | null; message: string | null }) =>
    supabaseAdmin.from('contact_requests').insert([{ name: cleanName, email: cleanEmail, ...row }])

  let storedAs = cleanIntent ?? 'none'
  let { error } = await insertRow({ intent: cleanIntent, message: cleanMsg })

  if (error && isNew && (error.code === '23514' || error.code === '22P02')) {
    storedAs = `general, message tagged (the intent column refused ${cleanIntent})`
    ;({ error } = await insertRow({
      intent:  'general',
      message: [TAGS[cleanIntent as string], cleanMsg].filter(Boolean).join(' '),
    }))
  }

  if (isNew) {
    const subject = SUBJECTS[cleanIntent as string]
    const failed  = error ? `NOT STORED: ${error.message}` : null
    after(() => notifyInternal({
      subject: `${failed ? 'UNSAVED ' : ''}${subject}: ${cleanName}`,
      text: [
        `${subject} from /contact (intent ${cleanIntent}).`,
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
