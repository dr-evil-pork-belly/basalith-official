import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { buildTerminationEmail } from '@/lib/pauseEmails'
import { getArchiveSession } from '@/lib/apiSecurity'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getArchiveSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { confirm?: boolean; archiveId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const archiveId = body.archiveId || session.archiveId

  // Must come from the owner's own session
  if (archiveId !== session.archiveId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!body.confirm) {
    return NextResponse.json({ error: 'Explicit confirmation required' }, { status: 400 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, owner_email, preferred_language, termination_requested_at')
    .eq('id', archiveId)
    .maybeSingle()

  if (!archive) return NextResponse.json({ error: 'Archive not found' }, { status: 404 })

  if (archive.termination_requested_at) {
    return NextResponse.json({ error: 'Termination already requested' }, { status: 409 })
  }

  const scheduledDeletion = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  await supabaseAdmin
    .from('archives')
    .update({
      termination_requested_at: new Date().toISOString(),
      scheduled_deletion_at:    scheduledDeletion.toISOString(),
    })
    .eq('id', archiveId)

  const firstName    = archive.owner_name?.split(' ')[0] ?? 'there'
  const deletionDate = scheduledDeletion.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const lang         = archive.preferred_language ?? 'en'

  try {
    await resend.emails.send({
      from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      archive.owner_email,
      subject: `Termination request received · ${archive.name}`,
      html:    buildTerminationEmail(firstName, archive.name, deletionDate, lang),
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
        'X-Entity-Ref-ID':  `basalith-termination-${archiveId}-${Date.now()}`,
      },
    })
  } catch (err: any) {
    console.error('[terminate] email failed:', err.message)
  }

  // Notify admin
  try {
    await resend.emails.send({
      from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz',
      subject: `Termination requested — ${archive.name}`,
      html:    `<p>Archive <strong>${archive.name}</strong> (${archiveId}) has requested termination.<br>Scheduled deletion: <strong>${deletionDate}</strong>.</p>`,
    })
  } catch {}

  return NextResponse.json({ success: true, scheduledDeletionAt: scheduledDeletion.toISOString() })
}
