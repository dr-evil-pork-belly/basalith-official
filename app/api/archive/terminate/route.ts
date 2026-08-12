import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { buildTerminationEmail } from '@/lib/pauseEmails'
import { getSessionUser } from '@/lib/auth/getSessionUser'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too). Without this, a
  // successor could schedule the owner's archive for deletion.
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { confirm?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

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

  // The write is the dissolution. Everything downstream, the owner's confirmation,
  // the admin page, the backup's exclusion filter, the runbook's whole date
  // arithmetic, reads termination_requested_at. Until August 12, 2026 this call
  // discarded its error: a failed write still answered success: true and still
  // emailed the owner "we received your termination request, deletion is scheduled
  // for <date>". Nothing was recorded, nothing would be deleted, and the only
  // party who could have noticed had been told it was handled.
  //
  // The error is the gate, and a zero row count deliberately is not. A row-count
  // check was tried and backed out: the archive is read a few lines above, and no
  // code path on this property deletes an archives row, so the only way this
  // matches nothing is an archive vanishing inside that window. Unreachable
  // today, and buying it costs a mock change inside the owner-guard suite.
  const { error: updateError } = await supabaseAdmin
    .from('archives')
    .update({
      termination_requested_at: new Date().toISOString(),
      scheduled_deletion_at:    scheduledDeletion.toISOString(),
    })
    .eq('id', archiveId)

  if (updateError) {
    // No emails. The owner must never be told a dissolution was recorded when it
    // was not, and a confirmation is not something a retry can take back.
    console.error(
      `[terminate] FAILED to record termination for ${archiveId}: ${updateError.message}. ` +
        `No emails sent. Nothing recorded.`,
    )
    return NextResponse.json({ error: 'Could not record termination request' }, { status: 500 })
  }

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

  // Notify admin.
  //
  // DISSOLUTION_RUNBOOK.md section 2: this email is the only notification that a
  // dissolution has started. Nothing else on the property raises a hand. Treat it
  // as a page, not as a newsletter. It failing silently, which is what `} catch {}`
  // did until August 12, 2026, meant a 12 month clock started with no operator
  // aware of it, and the next signal was the deletion date arriving unnoticed.
  //
  // Same shape as alertAdmin in lib/inngest/storageBackupFunctions.ts, and for the
  // same reason: the alert failing must never mask what it was alerting about. So
  // it logs loudly and the response still succeeds. The termination IS recorded at
  // this point, and answering 500 would send the owner back into a retry that the
  // 409 above rejects. There is no second alerting path on this property to fall
  // back to, and this is not the commit that invents one.
  try {
    await resend.emails.send({
      from:    `Basalith <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
      to:      process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz',
      subject: `Termination requested. ${archive.name}`,
      html:    `<p>Archive <strong>${archive.name}</strong> (${archiveId}) has requested termination.<br>Scheduled deletion: <strong>${deletionDate}</strong>.</p>`,
    })
  } catch (err: any) {
    console.error(
      `[terminate] ADMIN ALERT FAILED for ${archiveId}, scheduled deletion ${deletionDate}: ` +
        `${err?.message ?? String(err)}. The termination IS recorded. This log line is now the ` +
        `only notice that it happened, so the runbook clock is running unwatched.`,
    )
  }

  return NextResponse.json({ success: true, scheduledDeletionAt: scheduledDeletion.toISOString() })
}
