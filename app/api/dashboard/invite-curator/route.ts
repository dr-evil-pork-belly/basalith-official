import { NextRequest, NextResponse } from 'next/server'
import { createClient }       from '@/lib/supabase-server'
import { supabaseAdmin }      from '@/lib/supabase-admin'
import { randomBytes }        from 'crypto'

const VALID_CLEARANCE = ['level_3_curator', 'level_4_legal', 'level_5_full'] as const

export async function POST(req: NextRequest) {
  // Verify session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[invite-curator] user:', user ? { id: user.id, email: user.email } : null)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  }

  // Get vault
  const { data: vault, error: vaultError } = await supabase
    .from('vaults')
    .select('id')
    .eq('archivist_id', user.id)
    .single()
  console.log('[invite-curator] vault lookup:', { vault, error: vaultError })

  if (!vault) {
    return NextResponse.json({ ok: false, error: 'No vault found.' }, { status: 404 })
  }
  console.log('[invite-curator] vault_id:', vault.id)

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
  const allowedClearance = ['level_3_curator', 'level_4_legal', 'level_5_full'] as const
  const validatedClearance: typeof allowedClearance[number] = allowedClearance.includes(clearance as typeof allowedClearance[number])
    ? (clearance as typeof allowedClearance[number])
    : 'level_3_curator'

  const invite_token = randomBytes(24).toString('hex')

  // Insert curator record
  const { error: insertError } = await supabaseAdmin.from('curators').insert([{
    vault_id:        vault.id,
    email:           (email as string).trim().toLowerCase(),
    display_name:    (name as string).trim(),
    clearance:       validatedClearance,
    is_key_holder:   Boolean(is_key_holder),
    invite_token,
    invite_accepted: false,
    relation:        relation && typeof relation === 'string' ? relation.trim() || null : null,
  }])

  if (insertError) {
    console.error('[invite-curator] insert error (full):', JSON.stringify(insertError, null, 2))
    return NextResponse.json({ ok: false, error: 'Failed to create curator record.' }, { status: 500 })
  }
  console.log('[invite-curator] curator insert succeeded')

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
    console.error('[invite-curator] invite email error (full):', JSON.stringify(inviteError, null, 2))
  } else {
    console.log('[invite-curator] invite email sent successfully')
  }

  return NextResponse.json({ ok: true })
}
