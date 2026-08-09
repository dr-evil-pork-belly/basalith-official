/**
 * Archive export request.
 *
 * POST enqueues. It does not build. A 362 MB archive cannot be assembled and
 * delivered inside a request, and the previous implementation of this route
 * did not deliver bytes at all: it shipped a manifest whose media links
 * resolved to nothing on 316/316 photographs and 33/33 recordings, because it
 * constructed Storage paths instead of reading them.
 *
 * The work happens in lib/inngest/exportFunctions.ts. The owner gets an email
 * with a signed link when the zip is ready. See
 * docs/EXPORT_ROUTE_RECON_2026-08.md.
 *
 * AUTH IS UNCHANGED. Owner Supabase session only, ownership re-verified against
 * archives.owner_user_id, because getSessionUser fills archiveId for successors
 * too and a session carrying an archiveId is not proof of ownership.
 */
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { inngest } from '@/lib/inngest'
import { EXPORT_BUCKET } from '@/lib/archiveExportStorage'

export const dynamic = 'force-dynamic'

/** Debounce window. A double-clicked button must not build two 362 MB zips. */
const RECENT_REQUEST_MS = 10 * 60 * 1000

export async function POST() {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id, name, owner_email')
    .eq('id', archiveId)
    .maybeSingle()

  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // An owner with no email on file would get a zip nobody could tell them about.
  if (!ownerRow.owner_email) {
    return NextResponse.json(
      { error: 'No email address is on file for this archive. Contact hello@basalith.xyz and we will send your export directly.' },
      { status: 409 },
    )
  }

  // Debounce. Storage is the source of truth for "did we just do this", so
  // there is no separate table row that can drift away from the object.
  const { data: existing } = await supabaseAdmin.storage
    .from(EXPORT_BUCKET)
    .list(archiveId, { limit: 100 })

  const cutoff = Date.now() - RECENT_REQUEST_MS
  const recent = (existing ?? []).find((o: { created_at?: string }) =>
    o.created_at ? new Date(o.created_at).getTime() > cutoff : false,
  )
  if (recent) {
    return NextResponse.json({
      queued:  false,
      already: true,
      message: 'An export for this archive was prepared in the last few minutes. Check your email. If it has not arrived, wait a moment and try again.',
    })
  }

  const exportId = randomUUID()

  await inngest.send({
    name: 'archive/export.requested',
    data: { archiveId, exportId, requestedBy: session.userId },
  })

  return NextResponse.json({
    queued:   true,
    exportId,
    message:  'Your export is being prepared. It will arrive by email when it is ready, usually within a few minutes.',
  })
}
