import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { getOrCreateAuthUser } from '@/lib/auth/getOrCreateAuthUser'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session   = await getSessionUser()
  const archiveId = session?.archiveId
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; email?: string; organization?: string; title?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { name, email, organization, title, password } = body
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  // password_hash is NOT NULL; keep writing it even though sign-in is now the
  // magic-link flow (the column predates the Supabase Auth migration).
  const password_hash = await bcrypt.hash(password, 12)

  // Provision (or reuse) the successor's Supabase Auth user before the row
  // insert. getOrCreateAuthUser is an idempotent get-or-create that already
  // handles a pre-existing email without throwing, so a retry of this request
  // reuses the same Auth user rather than orphaning a new one. The id is then
  // linked onto the successor row so the magic-link login can resolve them.
  let authUserId: string
  try {
    authUserId = await getOrCreateAuthUser(normalizedEmail, 'successor')
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to provision sign-in account' },
      { status: 500 },
    )
  }

  const { data, error } = await supabaseAdmin
    .from('successors')
    .insert({
      archive_id:   archiveId,
      name:         name.trim(),
      email:        normalizedEmail,
      organization: organization?.trim() || null,
      title:        title?.trim()        || null,
      password_hash,
      auth_user_id: authUserId,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A successor with this email already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, successorId: data.id })
}
