import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

// Mobile login — email + password, looks up archive by owner_email then checks
// archive_credentials for that specific archive. No credential scanning.

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  // Find archive by owner email
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name, status, preferred_language')
    .eq('owner_email', email.toLowerCase().trim())
    .maybeSingle()

  if (!archive) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (archive.status && archive.status !== 'active') {
    return NextResponse.json({ error: 'Archive is not active' }, { status: 403 })
  }

  // Check credential for this archive
  const { data: credential } = await supabaseAdmin
    .from('archive_credentials')
    .select('password_hash')
    .eq('archive_id', archive.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!credential) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, credential.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Update last_used_at (non-blocking)
  supabaseAdmin
    .from('archive_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('archive_id', archive.id)
    .then(() => {})

  console.log('[mobile-login] archive:', archive.name, 'preferred_language:', archive.preferred_language)

  const preferredLanguage = archive.preferred_language || 'en'

  const payload = {
    success:           true,
    archiveId:         archive.id,
    archiveName:       archive.name,
    familyName:        archive.family_name,
    ownerName:         archive.owner_name,
    preferredLanguage,
  }
  console.log('[mobile-login] response:', JSON.stringify(payload))
  return NextResponse.json(payload)
}
