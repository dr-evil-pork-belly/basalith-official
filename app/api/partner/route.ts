import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const VALID_PROFESSIONS = [
  'Estate Attorney',
  'Financial Advisor',
  'Wealth Manager',
  'Luxury Real Estate',
  'Family Office',
  'Concierge Medicine',
  'Other',
] as const

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Generates a referral code in the format BSL-[3 initials]-[4 random chars]
 * Example: "David James Harrison" → BSL-DJH-K7M2
 * Falls back gracefully for short names.
 */
function generateReferralCode(name: string): string {
  const words   = name.trim().split(/\s+/).filter(Boolean)
  const initials = words
    .slice(0, 3)
    .map(w => w[0].toUpperCase())
    .join('')
    .padEnd(3, 'X') // pad to 3 if fewer than 3 words

  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O or 1/I to avoid confusion
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  return `BSL-${initials}-${suffix}`
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, email, firm_name, profession, message } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ ok: false, error: 'Name is required.' }, { status: 422 })
  }

  if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
    return NextResponse.json({ ok: false, error: 'A valid email address is required.' }, { status: 422 })
  }

  if (!profession || typeof profession !== 'string' || !VALID_PROFESSIONS.includes(profession as typeof VALID_PROFESSIONS[number])) {
    return NextResponse.json({ ok: false, error: 'Please select a profession.' }, { status: 422 })
  }

  const referral_code = generateReferralCode(name.trim())

  const { error } = await supabaseAdmin.from('partner_applications').insert([{
    name:         name.trim(),
    email:        email.trim().toLowerCase(),
    firm_name:    firm_name && typeof firm_name === 'string' ? firm_name.trim() || null : null,
    profession,
    message:      message  && typeof message  === 'string' ? message.trim()  || null : null,
    referral_code,
    status:       'applicant',
  }])

  if (error) {
    console.error('[partner] Supabase insert error:', error.message)
    return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, referral_code })
}
