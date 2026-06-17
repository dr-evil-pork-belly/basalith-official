import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'

// Provenance receipt read endpoint (phase 1, owner entity-chat only).
// Auth + authorization mirror app/api/archive/entity-chat/route.ts exactly:
// owner session -> x-archive-id header -> ?archiveId (mobile fallback) ->
// contributor bearer token. The receipt is then scoped to the authorized
// archive, so one archive can never read another's receipts.
export async function GET(req: NextRequest) {
  const messageId = req.nextUrl.searchParams.get('messageId')
  if (!messageId) {
    return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })
  }

  // ── Resolve caller identity (mirrors entity-chat) ──────────────────────────
  const session = await getSessionUser()

  const headerArchiveId  = req.headers.get('x-archive-id')
  const authHeader       = req.headers.get('authorization')
  const contributorToken = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('contributorToken') || undefined
  const queryArchiveId   = req.nextUrl.searchParams.get('archiveId')

  let authorizedArchiveId: string | null = null
  let callerType: 'owner' | 'contributor' | null = null

  if (session?.archiveId) {
    authorizedArchiveId = session.archiveId
    callerType          = 'owner'
  } else if (headerArchiveId || queryArchiveId) {
    // Mobile owner: validate the archiveId from header or query against DB
    const candidateId = headerArchiveId ?? queryArchiveId!
    const { data: mobileArchive } = await supabaseAdmin
      .from('archives')
      .select('id, status')
      .eq('id', candidateId)
      .maybeSingle()
    if (mobileArchive && (!mobileArchive.status || mobileArchive.status === 'active')) {
      authorizedArchiveId = candidateId
      callerType          = 'owner'
    }
  } else if (contributorToken) {
    const { data: contributor } = await supabaseAdmin
      .from('contributors')
      .select('archive_id, status')
      .eq('access_token', contributorToken)
      .eq('status', 'active')
      .maybeSingle()
    if (contributor) {
      authorizedArchiveId = contributor.archive_id
      callerType          = 'contributor'
    }
  }

  if (!authorizedArchiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Contributor access check (mirrors entity-chat)
  if (callerType === 'contributor') {
    const { data: archiveAccess } = await supabaseAdmin
      .from('archives')
      .select('contributor_entity_access')
      .eq('id', authorizedArchiveId)
      .single()

    if (!archiveAccess || archiveAccess.contributor_entity_access === 'none') {
      return NextResponse.json(
        { error: 'Entity access not yet available for contributors' },
        { status: 403 },
      )
    }
  }

  // ── Read the receipt, scoped to the authorized archive ─────────────────────
  const { data: receipt, error } = await supabaseAdmin
    .from('entity_response_receipts')
    .select('*')
    .eq('message_id', messageId)
    .eq('archive_id', authorizedArchiveId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!receipt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Still being attributed -> 202 so the client knows to poll again.
  if (receipt.status === 'pending') {
    return NextResponse.json({ receipt }, { status: 202 })
  }

  return NextResponse.json({ receipt })
}
