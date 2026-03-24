import { NextRequest, NextResponse } from 'next/server'
import { createClient }  from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const VALID_CATEGORIES = ['photograph', 'document', 'video', 'audio', 'text'] as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    vault_id, storage_path, original_name, mime_type,
    size_bytes, category, year, location, description,
  } = body as Record<string, unknown>

  // Validate required fields
  if (!vault_id      || typeof vault_id      !== 'string') return NextResponse.json({ ok: false, error: 'vault_id is required.'      }, { status: 422 })
  if (!storage_path  || typeof storage_path  !== 'string') return NextResponse.json({ ok: false, error: 'storage_path is required.'  }, { status: 422 })
  if (!original_name || typeof original_name !== 'string') return NextResponse.json({ ok: false, error: 'original_name is required.' }, { status: 422 })
  if (!mime_type     || typeof mime_type     !== 'string') return NextResponse.json({ ok: false, error: 'mime_type is required.'     }, { status: 422 })
  if (!size_bytes    || typeof size_bytes    !== 'number') return NextResponse.json({ ok: false, error: 'size_bytes is required.'    }, { status: 422 })
  if (!category      || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ ok: false, error: 'Invalid category.' }, { status: 422 })
  }

  // Verify this vault belongs to the authenticated archivist
  const { data: vault, error: vaultError } = await supabaseAdmin
    .from('vaults')
    .select('id, storage_used_bytes')
    .eq('id', vault_id)
    .eq('archivist_id', user.id)
    .single()

  if (vaultError || !vault) {
    return NextResponse.json({ ok: false, error: 'Vault not found or access denied.' }, { status: 403 })
  }

  // Insert vault_files record
  const { data: fileRecord, error: insertError } = await supabaseAdmin
    .from('vault_files')
    .insert([{
      vault_id,
      uploaded_by:   user.id,
      storage_path:  storage_path.trim(),
      original_name: original_name.trim(),
      mime_type:     mime_type.trim(),
      size_bytes:    size_bytes as number,
      category,
      year:          year        && typeof year        === 'number' ? year        : null,
      location:      location    && typeof location    === 'string' ? location.trim()    || null : null,
      description:   description && typeof description === 'string' ? description.trim() || null : null,
      essence_tagged: false,
    }])
    .select('id')
    .single()

  if (insertError) {
    console.error('[upload] insert error:', insertError.message)
    return NextResponse.json({ ok: false, error: 'Failed to register file.' }, { status: 500 })
  }

  // Increment vault storage_used_bytes
  const { error: storageUpdateError } = await supabaseAdmin
    .from('vaults')
    .update({ storage_used_bytes: (vault.storage_used_bytes ?? 0) + (size_bytes as number) })
    .eq('id', vault_id)

  if (storageUpdateError) {
    console.error('[upload] storage update error:', storageUpdateError.message)
    // Non-fatal — file is registered, storage stat is cosmetic
  }

  return NextResponse.json({ ok: true, file_id: fileRecord.id })
}
