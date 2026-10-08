import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrCreateAuthUser } from '@/lib/auth/getOrCreateAuthUser'
import { checkRateLimit, getClientIP } from '@/lib/apiSecurity'
import { deriveFamilyName } from '@/lib/trial'
import { notifyInternal } from '@/lib/internalNotify'
import { ASSESSMENT_STATUS } from '@/lib/assessment'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Assessment start. Public, no session. Slice 3b, October 8, 2026.
//
// A founder named on a dependency_reports row arrives with the row's id (from
// their invitation link) and types their own email. Both must match the row.
// The id alone starts nothing, and the response is the same whether the id is
// unknown or the email is wrong, so the route cannot be used to find out who
// is being assessed. The sign in link is then requested by the page and goes
// to the founder's mailbox, exactly as /begin does; this route sends the
// founder nothing.
//
// What it creates: the auth user (role owner) and the founder's record, an
// archives row with tier 'succession' and status 'assessment'
// (lib/assessment.ts). The tier gives the record the business seeds and probe
// set. The status keeps it out of every cron, the monthly coverage sweep, and
// the B2 backup.
//
// ONE WINNER. The row is claimed first: status goes 'ordered' to 'capturing'
// in one conditional update, and only the request that changed a row goes on
// to create the record. Two clicks cannot make two records. If the create
// fails the claim is undone.
//
// AN EXISTING CLIENT IS REFUSED (decided October 8, 2026). Someone who already
// owns a Basalith, or is a successor on one, is not given a second record by
// this route. The founder of Basalith is told and sets it up by hand. The
// checks run before any role is forced, so a successor's sign in is never
// rerouted by an attempt.

const ONE_HOUR_MS = 60 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const NOT_FOUND = 'We could not find that invitation. Use the link in your email and the address it was sent to.'
const EXISTING  = 'You already have a Basalith with us, so we will set this up with you directly. We have been told and will write to you.'
const FAILED    = 'Could not start right now. Please try again in a moment.'

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length < 6 || email.length > 254 || /\s/.test(email)) return null
  const at = email.indexOf('@')
  if (at < 1 || at !== email.lastIndexOf('@')) return null
  const domain = email.slice(at + 1)
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null
  return email
}

async function countBy(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
  if (error) throw new Error(`count ${table}.${column}: ${error.message}`)
  return count ?? 0
}

export async function POST(req: NextRequest) {
  // In-memory per instance: a cost guard, not a security control. The mailbox
  // check is Supabase's OTP, and the id plus email pair is the gate here.
  const ip = getClientIP(req)
  const { allowed } = checkRateLimit(`assessment-start:${ip}`, 10, ONE_HOUR_MS)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a while.' }, { status: 429 })
  }

  const body = (await req.json().catch(() => null)) as { order?: unknown; email?: unknown } | null
  const order = typeof body?.order === 'string' && UUID.test(body.order) ? body.order.toLowerCase() : null
  const email = normalizeEmail(body?.email)
  if (!order || !email) {
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 })
  }

  try {
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('dependency_reports')
      .select('id, status, archive_id, founder_name, founder_email, buyer_name')
      .eq('id', order)
      .maybeSingle()
    if (rowErr) throw new Error(`report read: ${rowErr.message}`)
    if (!row || row.founder_email !== email) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 })
    }

    // Already started (or finished): the record exists, so the page only has
    // to send the sign in link again.
    if (row.status !== 'ordered') {
      return NextResponse.json({ ok: true, existing: true })
    }

    const refuse = async (why: string) => {
      // A second click can arrive here after the first has already created
      // this founder's record, and would then find "an existing Basalith" that
      // is this assessment. Read the row again: if it has left 'ordered', the
      // record is theirs and there is nothing to refuse.
      const { data: again } = await supabaseAdmin
        .from('dependency_reports')
        .select('status')
        .eq('id', row.id)
        .maybeSingle()
      if (again && again.status !== 'ordered') {
        return NextResponse.json({ ok: true, existing: true })
      }

      after(async () => {
        await notifyInternal({
          subject: 'Dependency report: founder is already a client',
          text: [
            `Report: ${row.id}`,
            `Founder: ${row.founder_name} <${email}>`,
            `Buyer: ${row.buyer_name}`,
            `Why refused: ${why}`,
            'No record was created. The report is still ordered. Set this one up by hand.',
          ].join('\n'),
        })
      })
      return NextResponse.json({ error: EXISTING }, { status: 409 })
    }

    // Refusals that need no auth user, first.
    if (await countBy('archives', 'owner_email', email) > 0) return refuse('owns a Basalith (by owner_email)')

    // No forceRole yet: an existing role is left exactly as it is.
    const userId = await getOrCreateAuthUser(email, 'owner')
    if (await countBy('archives', 'owner_user_id', userId) > 0) return refuse('owns a Basalith (by owner_user_id)')
    if (await countBy('successors', 'auth_user_id', userId) > 0) return refuse('is a successor on a Basalith')
    if (await countBy('archivists', 'auth_user_id', userId) > 0) return refuse('has a guide account')

    // Claim. Only the request that moves the row out of 'ordered' goes on.
    const now = new Date().toISOString()
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('dependency_reports')
      .update({ status: 'capturing', updated_at: now })
      .eq('id', row.id)
      .eq('status', 'ordered')
      .select('id')
    if (claimErr) throw new Error(`claim: ${claimErr.message}`)
    if (!claimed || claimed.length === 0) {
      // Another request won the claim. Its record is this founder's record.
      return NextResponse.json({ ok: true, existing: true })
    }

    try {
      // Now the role: a contributor who is being assessed must land as an
      // owner, as on /begin. Successors and guides were refused above.
      await getOrCreateAuthUser(email, 'owner', { forceRole: true })

      const familyName = deriveFamilyName(row.founder_name)
      const { data: archive, error: archiveErr } = await supabaseAdmin
        .from('archives')
        .insert({
          name:            `${familyName} Basalith`,
          family_name:     familyName,
          owner_email:     email,
          owner_name:      row.founder_name,
          owner_user_id:   userId,
          tier:            'succession',
          status:          ASSESSMENT_STATUS,
          entity_pipeline: 'grounded',
        })
        .select('id')
        .single()
      if (archiveErr || !archive) throw new Error(`archive insert: ${archiveErr?.message ?? 'no row'}`)

      const { error: linkErr } = await supabaseAdmin
        .from('dependency_reports')
        .update({ archive_id: archive.id, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (linkErr) {
        // The record exists and is not linked. Remove it so the undo below
        // leaves nothing behind.
        await supabaseAdmin.from('archives').delete().eq('id', archive.id)
        throw new Error(`link: ${linkErr.message}`)
      }

      after(async () => {
        await notifyInternal({
          subject: `Assessment started: ${row.founder_name}`,
          text: [
            `Report: ${row.id}`,
            `Founder: ${row.founder_name} <${email}>`,
            `Buyer: ${row.buyer_name}`,
            `Record: ${archive.id}`,
          ].join('\n'),
        })
      })

      return NextResponse.json({ ok: true })
    } catch (err) {
      // Undo the claim so the founder can try again.
      const { error: undoErr } = await supabaseAdmin
        .from('dependency_reports')
        .update({ status: 'ordered', updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('status', 'capturing')
        .is('archive_id', null)
      if (undoErr) {
        console.error('[assessment/start] could not undo the claim:', row.id, undoErr.message)
        after(async () => {
          await notifyInternal({
            subject: 'Dependency report: a start failed and the row is stuck',
            text:    [`Report: ${row.id}`, `Undo error: ${undoErr.message}`, 'Status is capturing with no record. Set it back to ordered by hand.'].join('\n'),
          })
        })
      }
      throw err
    }
  } catch (err) {
    console.error('[assessment/start]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: FAILED }, { status: 500 })
  }
}
