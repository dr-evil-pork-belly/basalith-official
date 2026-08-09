/**
 * Archive export job.
 *
 * The request handler enqueues and returns. This does the work, because a
 * 362 MB archive cannot be assembled and delivered inside a request. See
 * docs/EXPORT_ROUTE_RECON_2026-08.md section 4.
 *
 * FAILURE POLICY
 *
 * Any table query error aborts before a single file is written, emails the
 * admin with the failing table and the error, and tells the owner plainly that
 * the export did not complete. There is no path here that delivers a zip built
 * from an errored query. That is the whole point of the rebuild.
 */
import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { buildArchiveExport, ExportQueryError, ExportMediaError } from '@/lib/archiveExport'
import { reapExpiredExports } from '@/lib/archiveExportReaper'
import {
  EXPORT_BUCKET,
  RETENTION_SECONDS,
  exportObjectPath,
  expiresAt,
  formatExpiry,
} from '@/lib/archiveExportStorage'
import {
  buildExportReadyEmail,
  buildExportReadySubject,
  buildExportFailedEmail,
  buildExportFailedSubject,
  buildExportAdminAlert,
} from '@/lib/emails/archiveExport'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'

async function alertAdmin(params: {
  archiveId: string; archiveName: string; exportId: string; stage: string; detail: string
}) {
  try {
    await resend.emails.send({
      from:    RESEND_FROM,
      to:      ADMIN_EMAIL,
      subject: `[basalith] export failed at ${params.stage} · ${params.archiveName}`,
      html:    buildExportAdminAlert(params),
    })
  } catch (e) {
    // Never let the alert failure mask the original failure.
    console.error('[export] admin alert failed to send:', e)
  }
}

export const buildArchiveExportJob = inngest.createFunction(
  {
    id:          'build-archive-export',
    name:        'Build archive export',
    retries:     2,
    concurrency: { limit: 2 },
    // A duplicate delivery of the same request must not build a second zip.
    idempotency: 'event.data.exportId',
    triggers:    [{ event: 'archive/export.requested' }],
  },
  async ({ event, step }) => {
    const archiveId = event.data?.archiveId as string | undefined
    const exportId  = event.data?.exportId  as string | undefined

    if (!archiveId || !exportId) {
      throw new Error('archive/export.requested missing archiveId or exportId')
    }

    // Reap first. Any export activity cleans the bucket, so retention does not
    // depend on a single daily cron continuing to run.
    await step.run('reap-expired', async () => reapExpiredExports())

    // ── 1. Build. Throws on any query error, before anything is written. ─────
    let built: Awaited<ReturnType<typeof buildArchiveExport>>
    try {
      built = await buildArchiveExport(supabaseAdmin as never, archiveId, {
        onProgress: (m) => console.log(`[export ${exportId}] ${m}`),
      })
    } catch (err) {
      // Both abort classes are handled identically: no zip, admin alerted, owner
      // told plainly. The stage differs only so the alert says which it was.
      let stage  = 'build'
      let detail = (err as Error)?.stack ?? String(err)

      if (err instanceof ExportQueryError) {
        stage  = 'table-query'
        detail = err.failures.map(f => `${f.table}: ${f.message}`).join('\n')
      } else if (err instanceof ExportMediaError) {
        stage  = 'media-download'
        detail = err.failures
          .map(f => `${f.bucket}/${f.storagePath}\n    recorded by ${f.table}\n    ${f.message}`)
          .join('\n')
      }

      console.error(`[export ${exportId}] ABORTED at ${stage}:`, detail)

      // Resolve a name for the alert without assuming the archive query worked.
      const { data: a } = await supabaseAdmin
        .from('archives').select('name, owner_name, owner_email').eq('id', archiveId).maybeSingle()

      await alertAdmin({
        archiveId,
        archiveName: a?.name ?? archiveId,
        exportId,
        stage,
        detail,
      })

      if (a?.owner_email) {
        try {
          await resend.emails.send({
            from:    RESEND_FROM,
            to:      a.owner_email,
            subject: buildExportFailedSubject(a.name ?? 'Your archive'),
            html:    buildExportFailedEmail(a.owner_name?.split(' ')[0] ?? 'there', a.name ?? 'Your archive'),
          })
        } catch (e) {
          console.error(`[export ${exportId}] owner failure notice did not send:`, e)
        }
      }

      // Rethrow so the run is red in Inngest, not silently green.
      throw err
    }

    const { zip, manifest, archive } = built

    // ── 2. Upload. Guarded so a retry does not write a second object. ────────
    const objectPath = exportObjectPath(archiveId, exportId)

    const uploaded = await step.run('upload-zip', async () => {
      const { error } = await supabaseAdmin.storage
        .from(EXPORT_BUCKET)
        .upload(objectPath, zip, {
          contentType: 'application/zip',
          upsert:      true,   // idempotent on retry, same exportId, same path
        })
      if (error) throw new Error(`Upload to ${EXPORT_BUCKET}/${objectPath} failed: ${error.message}`)
      return { path: objectPath, bytes: zip.length, at: new Date().toISOString() }
    })

    // ── 3. Sign for exactly the object's lifetime. Not longer, not shorter. ──
    const link = await step.run('sign-url', async () => {
      const { data, error } = await supabaseAdmin.storage
        .from(EXPORT_BUCKET)
        .createSignedUrl(objectPath, RETENTION_SECONDS, { download: `basalith-archive-${objectPath.split('/')[1]}` })
      if (error || !data?.signedUrl) {
        throw new Error(`Signing ${objectPath} failed: ${error?.message ?? 'no url returned'}`)
      }
      return { url: data.signedUrl }
    })

    const createdAt = new Date(uploaded.at)
    const expiry    = expiresAt(createdAt)

    // ── 4. Deliver. ──────────────────────────────────────────────────────────
    await step.run('email-owner', async () => {
      if (!archive.ownerEmail) {
        // Not silent. The zip exists and is reachable, but nobody was told.
        await alertAdmin({
          archiveId,
          archiveName: archive.name,
          exportId,
          stage:       'email-owner',
          detail:      `Export built and uploaded to ${objectPath} but archives.owner_email is null, so no download link was sent.`,
        })
        return { sent: false, reason: 'no owner_email' }
      }

      await resend.emails.send({
        from:    RESEND_FROM,
        to:      archive.ownerEmail,
        subject: buildExportReadySubject(archive.name),
        html:    buildExportReadyEmail({
          firstName:   archive.ownerName?.split(' ')[0] ?? 'there',
          archiveName: archive.name,
          downloadUrl: link.url,
          expiryDate:  formatExpiry(expiry),
          fileCount:   manifest.totals.mediaFiles,
          recordCount: manifest.totals.tableRows,
          sizeMb:      (zip.length / 1024 / 1024).toFixed(2),
        }),
      })
      return { sent: true }
    })

    // No post-hoc storage-miss alert here on purpose. A file the database
    // records but Storage cannot return now throws ExportMediaError inside
    // buildArchiveExport, so this line is only reached when every recorded file
    // was read. Reaching it at all is the proof.
    return {
      ok:          true,
      archiveId,
      exportId,
      objectPath,
      bytes:       zip.length,
      mediaFiles:  manifest.totals.mediaFiles,
      tableRows:   manifest.totals.tableRows,
      expiresAt:   expiry.toISOString(),
    }
  },
)
