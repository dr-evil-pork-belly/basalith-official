import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAuthUser } from '@/lib/auth/getOrCreateAuthUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { deriveFamilyName, trialWindow } from '@/lib/trial'
import { notifyInternal } from '@/lib/internalNotify'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Self-serve trial start. Public, no session. Skeleton 1.2, steps 1 to 8.
//
// Creates the auth user (role forced to owner) and the trial archive in this
// POST, not at first sign-in: the callback is where a zero-archive owner was
// looping (recon B3), and creating on arrival would need a second path for a
// person who types the dashboard URL before clicking the link. The cost is
// one archive row per unproven mailbox; slice B's deletion job collects it
// with everything else at thirty days.
//
// This route sends no email to the person. The page calls signInWithOtp with
// shouldCreateUser: false after this returns, exactly as /archive-login does,
// and the auth user now exists so the link sends. The only send here is the
// internal "Trial started" notice, under after().

const ONE_HOUR_MS = 60 * 60 * 1000
const MAX_NAME = 120
const MAX_PROMPT = 500

type Body = { email?: unknown; name?: unknown; forWhom?: unknown; prompt?: unknown }

// A plain address shape: one @, something before it, a dot after it, no
// whitespace. Deliberately no library. Supabase makes the final call when the
// OTP is requested.
function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length < 6 || email.length > 254) return null
  const at = email.indexOf('@')
  if (at < 1 || at !== email.lastIndexOf('@')) return null
  const domain = email.slice(at + 1)
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null
  if (/\s/.test(email)) return null
  return email
}

export async function POST(req: NextRequest) {
  // 1. Rate limit. In-memory per instance (recon C5): a cost guard, not a
  //    security control. The mailbox check is Supabase's OTP.
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`trial-start:${ip}`, 5, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a while.' }, { status: 429 })
  }

  const body = (await req.json().catch(() => null)) as Body | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // 2. Normalize and validate the fields.
  const email = normalizeEmail(body.email)
  if (!email) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : ''
  if (!name) {
    return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  }
  const forWhom: 'me' | 'someone' = body.forWhom === 'someone' ? 'someone' : 'me'
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, MAX_PROMPT) : ''

  try {
    // 3. The auth user. forceRole so a contributor who starts their own
    //    archive is routed as an owner by the callback (recon B4).
    const userId = await getOrCreateAuthUser(email, 'owner', { forceRole: true })

    // 4. One archive per person. By owner_user_id, never by email.
    const { data: owned, error: ownedErr } = await supabaseAdmin
      .from('archives')
      .select('id, status')
      .eq('owner_user_id', userId)
      .limit(1)
    if (ownedErr) throw new Error(`existing archive read: ${ownedErr.message}`)
    if (owned && owned.length > 0) {
      return NextResponse.json({ ok: true, existing: true })
    }

    // 5. The trial archive. Nothing beyond these columns; defaults cover the
    //    counters. grounded is deliberate: the entity a trialist meets is the
    //    verified one (skeleton 5.3).
    const familyName = deriveFamilyName(name)
    const window = trialWindow()
    const { data: archive, error: archiveErr } = await supabaseAdmin
      .from('archives')
      .insert({
        name:             `${familyName} Archive`,
        family_name:      familyName,
        owner_email:      email,
        owner_name:       name,
        owner_user_id:    userId,
        tier:             'active',
        status:           'trial',
        trial_started_at: window.startedAt,
        trial_expires_at: window.expiresAt,
        entity_pipeline:  'grounded',
      })
      .select('id')
      .single()
    if (archiveErr || !archive) throw new Error(`archive insert: ${archiveErr?.message ?? 'no row'}`)

    // 6. The application row, so the existing admin tooling sees the lead.
    //    Live NOT NULL columns without defaults (read September 17, 2026):
    //    name, email, reason, referral_source. apply_type defaults 'legacy',
    //    status defaults 'pending', subject and notes are nullable.
    const { error: appErr } = await supabaseAdmin
      .from('archive_applications')
      .insert({
        name,
        email,
        apply_type:      'legacy',
        status:          'trial',
        referral_source: 'self-serve',
        reason:          prompt || 'trial',
        subject:         null,
        notes:           forWhom,
      })
    if (appErr) {
      // The archive exists and the person can sign in. The lead row is
      // bookkeeping; log it and carry on rather than failing the trial.
      console.error('[trial/start] archive_applications insert failed:', appErr.message)
    }

    // 7. Internal notice, after the response.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
    after(async () => {
      await notifyInternal({
        subject: `Trial started: ${familyName} Archive`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `For: ${forWhom === 'someone' ? 'someone they are helping' : 'themselves'}`,
          `What brought them: ${prompt || '(blank)'}`,
          `Archive: ${archive.id}`,
          `Expires: ${window.expiresAt}`,
          `God view: ${siteUrl}/god`,
        ].join('\n'),
      })
    })

    // 8.
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[trial/start]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not start your archive right now. Please try again in a moment.' }, { status: 500 })
  }
}
