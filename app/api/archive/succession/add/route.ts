import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const archiveId = req.cookies.get('archive-id')?.value
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; email?: string; organization?: string; title?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { name, email, organization, title, password } = body
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  const { data, error } = await supabaseAdmin
    .from('successors')
    .insert({
      archive_id:   archiveId,
      name:         name.trim(),
      email:        email.trim().toLowerCase(),
      organization: organization?.trim() || null,
      title:        title?.trim()        || null,
      password_hash,
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
