import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { NextRequest, NextResponse } from 'next/server'

// Bridges the iOS app's Supabase session to the contributor portal.
//
// The contributor surface (/api/contribute/*) authenticates on
// contributors.access_token, the same token the emailed /contribute/{token}
// link carries. A family member who signs in to the app with their email has a
// Supabase session but no token in hand. This route hands them their own token
// for one archive, matched strictly on the session email, so the app can then
// call the existing contribute routes unchanged.
//
// Auth: Supabase session (cookie or Bearer). The archive is named by the caller
// but access is only granted when an ACTIVE contributors row exists for
// (archive_id, session.email). A session cannot obtain a token for an archive it
// was not invited to, and it cannot obtain another contributor's token.
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { archiveId?: string }
    const archiveId = typeof body.archiveId === 'string' ? body.archiveId : null
    if (!archiveId) {
      return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
    }

    const { data: contributor } = await supabaseAdmin
      .from('contributors')
      .select('id, name, relationship, access_token, archive_id, status')
      .eq('archive_id', archiveId)
      .eq('email', session.email.toLowerCase())
      .eq('status', 'active')
      .maybeSingle()

    if (!contributor) {
      // Deliberately the same shape whether the archive does not exist or the
      // caller is simply not a contributor to it.
      return NextResponse.json({ error: 'Not a contributor to this archive' }, { status: 403 })
    }

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('id, name, owner_name, preferred_language, status')
      .eq('id', archiveId)
      .maybeSingle()

    if (!archive || (archive.status && archive.status !== 'active')) {
      return NextResponse.json({ error: 'Archive is not active' }, { status: 403 })
    }

    // contributor_entity_access is read on its own so a schema without the
    // column degrades to 'none' instead of failing the whole request. The
    // entity-chat route applies the same default when the value is missing.
    let entityAccess = 'none'
    const { data: accessRow, error: accessErr } = await supabaseAdmin
      .from('archives')
      .select('contributor_entity_access')
      .eq('id', archiveId)
      .maybeSingle()
    if (!accessErr && accessRow?.contributor_entity_access) {
      entityAccess = String(accessRow.contributor_entity_access)
    }

    return NextResponse.json({
      contributorId:   contributor.id,
      contributorName: contributor.name ?? null,
      relationship:    contributor.relationship ?? null,
      token:           contributor.access_token,
      archive: {
        id:                archive.id,
        name:              archive.name,
        ownerName:         archive.owner_name ?? null,
        preferredLanguage: archive.preferred_language ?? 'en',
        entityAccess,
      },
    })
  } catch (error: unknown) {
    console.error('[mobile/contributor-session] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
