import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  let email: string, password: string
  try {
    const body = await req.json()
    email    = (body.email    ?? '').trim().toLowerCase()
    password = body.password ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const { data: successor } = await supabaseAdmin
    .from('successors')
    .select('id, archive_id, name, organization, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (!successor) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const matches = await bcrypt.compare(password, successor.password_hash)
  if (!matches) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  void supabaseAdmin
    .from('successors')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', successor.id)

  const session = JSON.stringify({
    successorId:  successor.id,
    archiveId:    successor.archive_id,
    name:         successor.name,
    organization: successor.organization ?? null,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('successor_session', session, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7,
    path:     '/',
  })
  return res
}
