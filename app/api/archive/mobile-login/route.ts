import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'

// Mobile-friendly login — returns archiveId + archive metadata in JSON body.
// The mobile app stores archiveId in SecureStore and passes it as a param.

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  let archiveId: string | null = null

  // Check Supabase hashed credentials
  const { data: allCredentials } = await supabaseAdmin
    .from('archive_credentials')
    .select('archive_id, password_hash')
    .eq('is_active', true)

  if (allCredentials?.length) {
    for (const cred of allCredentials) {
      const matches = await bcrypt.compare(password, cred.password_hash)
      if (matches) {
        archiveId = cred.archive_id
        supabaseAdmin
          .from('archive_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('archive_id', cred.archive_id)
          .then(() => {})
        break
      }
    }
  }

  // Fall back to env var credentials
  if (!archiveId) {
    const credMap = process.env.ARCHIVE_CREDENTIALS ?? ''
    for (const pair of credMap.split(',')) {
      const [p, id] = pair.split(':')
      if (p?.trim() === password) { archiveId = id?.trim() ?? null; break }
    }
  }

  if (!archiveId) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name, status, preferred_language')
    .eq('id', archiveId)
    .single()

  if (!archive || (archive.status && archive.status !== 'active')) {
    return NextResponse.json({ error: 'Archive not found or inactive' }, { status: 403 })
  }

  return NextResponse.json({
    success:           true,
    archiveId:         archive.id,
    archiveName:       archive.name,
    familyName:        archive.family_name,
    ownerName:         archive.owner_name,
    preferredLanguage: archive.preferred_language ?? 'en',
  })
}
