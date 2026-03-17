import { NextRequest, NextResponse } from 'next/server'
import { createClient }  from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  // Verify session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorised.' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { token } = body as Record<string, unknown>

  if (!token || typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ ok: false, error: 'Invite token is required.' }, { status: 422 })
  }

  // Find the pending curator record
  const { data: curator, error: findError } = await supabaseAdmin
    .from('curators')
    .select('id, vault_id, invite_accepted')
    .eq('invite_token', token.trim())
    .single()

  if (findError || !curator) {
    return NextResponse.json({ ok: false, error: 'Invitation not found.' }, { status: 404 })
  }

  if (curator.invite_accepted) {
    return NextResponse.json({ ok: false, error: 'This invitation has already been accepted.' }, { status: 409 })
  }

  // Update curator record — link to this user
  const { error: curatorError } = await supabaseAdmin
    .from('curators')
    .update({
      profile_id:      user.id,
      invite_accepted: true,
      accepted_at:     new Date().toISOString(),
    })
    .eq('id', curator.id)

  if (curatorError) {
    console.error('[accept-invite] curator update error:', curatorError.message)
    return NextResponse.json({ ok: false, error: 'Failed to accept invitation.' }, { status: 500 })
  }

  // Update profiles — set role and vault_id
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role:     'curator',
      vault_id: curator.vault_id,
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('[accept-invite] profile update error:', profileError.message)
    // Non-fatal — curator record is already linked; profile can be fixed manually
  }

  return NextResponse.json({ ok: true, vault_id: curator.vault_id })
}
