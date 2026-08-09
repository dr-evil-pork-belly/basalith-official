/**
 * Archive export emails.
 *
 * Styling matches lib/pauseEmails.ts. HTML only, which is the repo-wide gap
 * recorded in CLAUDE.md section 6, not a new one introduced here.
 *
 * The expiry is stated as an absolute date, never as a duration. "Expires in 7
 * days" is unreadable in an inbox a week later, and the voice portrait emails
 * that stated a duration are exactly why two families could not reach audio we
 * still hold.
 */

const S = {
  body:    'background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0',
  eyebrow: "font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px",
  p:       'font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px',
  pBright: 'font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 16px',
  goldBtn: "display:inline-block;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;color:#0A0908;background:#C4A24A;padding:14px 30px",
  meta:    "font-family:'Courier New',monospace;font-size:12px;letter-spacing:1px;color:#B8B4AB;line-height:2;margin:0",
  footer:  "font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#706C65;line-height:1.8;margin:0",
  rule:    'border:0;border-top:1px solid rgba(240,237,230,0.08);margin:28px 0',
}

function wrap(archiveName: string, inner: string): string {
  return `<!DOCTYPE html>
<html>
<body style="${S.body}">
  <div style="padding:40px 32px 0;text-align:center">
    <p style="${S.eyebrow}">${escapeHtml(archiveName).toUpperCase()}</p>
  </div>
  <div style="padding:24px 32px">
${inner}
  </div>
  <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="${S.footer}">BASALITH<br>${escapeHtml(archiveName)}<br>Heritage Nexus Inc.</p>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildExportReadySubject(archiveName: string): string {
  return `Your archive export is ready · ${archiveName}`
}

export interface ExportReadyParams {
  firstName:    string
  archiveName:  string
  downloadUrl:  string
  expiryDate:   string   // absolute, already formatted
  fileCount:    number
  recordCount:  number
  sizeMb:       string
}

export function buildExportReadyEmail(p: ExportReadyParams): string {
  return wrap(p.archiveName, `
    <p style="${S.p}">${escapeHtml(p.firstName)},</p>

    <p style="${S.pBright}">Your archive export is ready.</p>

    <p style="${S.p}">
      This is a single zip file holding everything recorded in your archive. The
      actual photographs, recordings, and records, not links to them. It opens
      without an account and without any connection to Basalith. The manifest
      inside names anything excluded and the reason.
    </p>

    <div style="text-align:center;margin:32px 0">
      <a href="${escapeHtml(p.downloadUrl)}" style="${S.goldBtn}">Download your archive</a>
    </div>

    <hr style="${S.rule}">

    <p style="${S.meta}">
      ${p.fileCount} files, ${escapeHtml(p.sizeMb)} MB<br>
      ${p.recordCount} records<br>
      Link works until ${escapeHtml(p.expiryDate)}
    </p>

    <hr style="${S.rule}">

    <p style="${S.p}">
      On ${escapeHtml(p.expiryDate)} this link stops working and the file is deleted
      from our servers. That is deliberate. A full copy of your recorded archive
      should not sit on a download server indefinitely.
    </p>

    <p style="${S.p}">
      Your archive itself is not affected by that date. You can request another
      export at any time, as often as you like, with no reason required.
    </p>

    <p style="${S.p}">
      Once you have downloaded the zip, it is yours to keep. Nothing in it stops
      working if Basalith does.
    </p>
  `)
}

export function buildExportFailedSubject(archiveName: string): string {
  return `Export could not be completed · ${archiveName}`
}

export function buildExportFailedEmail(firstName: string, archiveName: string): string {
  return wrap(archiveName, `
    <p style="${S.p}">${escapeHtml(firstName)},</p>

    <p style="${S.pBright}">Your archive export did not complete.</p>

    <p style="${S.p}">
      Nothing is wrong with your archive and nothing has been lost. The problem is
      on our side, in the process that assembles the file. We stopped rather than
      send you a partial export, because an export that quietly leaves something
      out is worse than no export.
    </p>

    <p style="${S.p}">
      We have been alerted and are looking at it. You do not need to do anything.
      We will write again when it is ready.
    </p>

    <p style="${S.p}">
      If you would rather speak to someone, reply to this message or write to
      hello@basalith.xyz.
    </p>
  `)
}

/** Admin alert. Internal, plain, and specific enough to act on without opening logs. */
export function buildExportAdminAlert(params: {
  archiveId:   string
  archiveName: string
  exportId:    string
  stage:       string
  detail:      string
}): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:'Courier New',monospace;font-size:13px;color:#111;background:#fff;padding:24px">
  <p><strong>Archive export failed.</strong></p>
  <p>
    archive_id: ${escapeHtml(params.archiveId)}<br>
    archive:    ${escapeHtml(params.archiveName)}<br>
    export_id:  ${escapeHtml(params.exportId)}<br>
    stage:      ${escapeHtml(params.stage)}
  </p>
  <p><strong>Detail</strong></p>
  <pre style="white-space:pre-wrap;background:#f4f4f4;padding:12px;border-left:3px solid #C4A24A">${escapeHtml(params.detail)}</pre>
  <p>No zip was written and no download email was sent to the owner.</p>
</body>
</html>`
}
