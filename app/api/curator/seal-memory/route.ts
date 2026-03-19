import { NextRequest, NextResponse } from 'next/server'
import { createClient }  from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorised.' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { file_id, trait, choice_label, choice_description, vault_id, curator_name, file_name, file_year } =
    body as Record<string, unknown>

  if (!file_id || typeof file_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'file_id is required.' }, { status: 422 })
  }
  if (!trait || typeof trait !== 'string') {
    return NextResponse.json({ ok: false, error: 'trait is required.' }, { status: 422 })
  }
  if (!choice_label || typeof choice_label !== 'string') {
    return NextResponse.json({ ok: false, error: 'choice_label is required.' }, { status: 422 })
  }
  if (!vault_id || typeof vault_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'vault_id is required.' }, { status: 422 })
  }

  // Verify this curator belongs to this vault
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('vault_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.vault_id !== vault_id) {
    return NextResponse.json({ ok: false, error: 'You do not have access to this vault.' }, { status: 403 })
  }

  // Insert essence session
  const { error: sessionError } = await supabaseAdmin
    .from('essence_sessions')
    .insert([{
      vault_id,
      curator_id:         user.id,
      file_id,
      trait,
      choice_label,
      choice_description: choice_description && typeof choice_description === 'string'
        ? choice_description
        : null,
      essence_gain: 1,
      sealed_at:    new Date().toISOString(),
      skipped:      false,
    }])

  if (sessionError) {
    console.error('[seal-memory] session insert error:', sessionError.message)
    return NextResponse.json({ ok: false, error: 'Failed to record session.' }, { status: 500 })
  }

  // Mark file as essence_tagged
  const { error: fileError } = await supabaseAdmin
    .from('vault_files')
    .update({ essence_tagged: true })
    .eq('id', file_id)

  if (fileError) {
    console.error('[seal-memory] file update error:', fileError.message)
  }

  // Recalculate essence_percent for the vault
  const [{ count: taggedCount }, { count: totalCount }] = await Promise.all([
    supabaseAdmin
      .from('vault_files')
      .select('id', { count: 'exact', head: true })
      .eq('vault_id', vault_id)
      .eq('essence_tagged', true),
    supabaseAdmin
      .from('vault_files')
      .select('id', { count: 'exact', head: true })
      .eq('vault_id', vault_id),
  ])

  const newPercent = totalCount && totalCount > 0
    ? Math.round(((taggedCount ?? 0) / totalCount) * 100)
    : 0

  await supabaseAdmin
    .from('vaults')
    .update({ essence_percent: newPercent })
    .eq('id', vault_id)

  // Insert vault notification for archivist
  await supabaseAdmin
    .from('vault_notifications')
    .insert([{
      vault_id,
      type:         'memory_sealed',
      curator_name: curator_name && typeof curator_name === 'string' ? curator_name : null,
      trait:        trait as string,
      choice_label: choice_label as string,
      file_name:    file_name   && typeof file_name   === 'string' ? file_name   : null,
      file_year:    file_year   && typeof file_year   === 'number' ? file_year   : null,
      read:         false,
    }])

  return NextResponse.json({ ok: true, new_essence_percent: newPercent })
}
