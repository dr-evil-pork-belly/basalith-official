import { NextRequest, NextResponse } from 'next/server'
import { createClient }       from '@/lib/supabase-server'
import { supabaseAdmin }      from '@/lib/supabase-admin'
import { randomBytes }        from 'crypto'

const VALID_CLEARANCE = ['curator', 'legal_financial', 'full'] as const

export async function POST(req: NextRequest) {
  // Verify session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorised.' }, { status: 401 })
  }

  // Get vault
  const { data: vault } = await supabase
    .from('vaults')
    .select('id')
    .eq('archivist_id', user.id)
    .single()

  if (!vault) {
    return NextResponse.json({ ok: false, error: 'No vault found.' }, { status: 404 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { name, email, relation, clearance, is_key_holder } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ ok: false, error: 'Name is required.' }, { status: 422 })
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ ok: false, error: 'A valid email is required.' }, { status: 422 })
  }
  if (!clearance || !VALID_CLEARANCE.includes(clearance as typeof VALID_CLEARANCE[number])) {
    return NextResponse.json({ ok: false, error: 'Invalid clearance level.' }, { status: 422 })
  }

  const invite_token = randomBytes(24).toString('hex')

  // Insert curator record
  const { error: insertError } = await supabaseAdmin.from('curators').insert([{
    vault_id:        vault.id,
    email:           (email as string).trim().toLowerCase(),
    display_name:    (name as string).trim(),
    clearance:       clearance,
    is_key_holder:   Boolean(is_key_holder),
    invite_token,
    invite_accepted: false,
    relation:        relation && typeof relation === 'string' ? relation.trim() || null : null,
  }])

  if (insertError) {
    console.error('[invite-curator] insert error:', insertError.message)
    return NextResponse.json({ ok: false, error: 'Failed to create curator record.' }, { status: 500 })
  }

  // Send invite email via Supabase Auth
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    (email as string).trim().toLowerCase(),
    {
      data: {
        role:         'curator',
        vault_id:     vault.id,
        invite_token,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback?next=/dashboard`,
    }
  )

  if (inviteError) {
    // Non-fatal — curator record exists, email can be resent manually
    console.error('[invite-curator] invite email error:', inviteError.message)
  }

  return NextResponse.json({ ok: true })
}
