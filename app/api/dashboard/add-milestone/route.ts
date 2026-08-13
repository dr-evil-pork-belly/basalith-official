import { NextRequest, NextResponse } from 'next/server'
import { createClient }  from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const VALID_CATEGORIES    = ['Financial', 'Personal', 'Continuity', 'Legal'] as const
const VALID_TRIGGER_TYPES = ['Age Gate', 'Temporal', 'Manual'] as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  }

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

  const { title, description, category, trigger_type, trigger_value, beneficiary_id, requires_key_holder } = body as Record<string, unknown>

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ ok: false, error: 'Title is required.' }, { status: 422 })
  }
  if (!category || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ ok: false, error: 'Invalid category.' }, { status: 422 })
  }
  if (!trigger_type || !VALID_TRIGGER_TYPES.includes(trigger_type as typeof VALID_TRIGGER_TYPES[number])) {
    return NextResponse.json({ ok: false, error: 'Invalid trigger type.' }, { status: 422 })
  }
  if (!trigger_value || typeof trigger_value !== 'string' || !trigger_value.trim()) {
    return NextResponse.json({ ok: false, error: 'Trigger value is required.' }, { status: 422 })
  }

  // beneficiary_id is optional and stays optional. When it is present it arrives from the
  // request body, so confirm it names a curator in the caller's own vault before it is
  // written. The scope lives in the query, so another vault's curator does not resolve.
  const beneficiaryId = beneficiary_id && typeof beneficiary_id === 'string' ? beneficiary_id : null

  if (beneficiaryId) {
    const { data: beneficiary, error: beneficiaryError } = await supabaseAdmin
      .from('curators')
      .select('id')
      .eq('id',       beneficiaryId)
      .eq('vault_id', vault.id)
      .maybeSingle()

    if (beneficiaryError || !beneficiary) {
      return NextResponse.json({ ok: false, error: 'Beneficiary not found in this vault.' }, { status: 403 })
    }
  }

  const { data, error } = await supabaseAdmin.from('milestones').insert([{
    vault_id:            vault.id,
    title:               (title as string).trim(),
    description:         description && typeof description === 'string' ? description.trim() || null : null,
    category,
    trigger_type,
    trigger_value:       (trigger_value as string).trim(),
    beneficiary_id:      beneficiaryId,
    requires_key_holder: Boolean(requires_key_holder),
    status:              'armed',
  }]).select('id').single()

  if (error) {
    console.error('[add-milestone] insert error:', error.message)
    return NextResponse.json({ ok: false, error: 'Failed to create milestone.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}
