const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

const BASE_STYLES = {
  body:       'background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0',
  mono:       "font-family:'Courier New',monospace",
  eyebrow:    "font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;text-transform:uppercase;margin:0 0 16px",
  goldBtn:    "display:inline-block;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;color:#0A0908;background:#C4A24A;padding:12px 28px",
  ghostBtn:   "display:inline-block;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;color:#C4A24A;border:1px solid rgba(196,162,74,0.4);padding:12px 28px",
  footer:     "font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:0",
}

function wrap(archiveName: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="${BASE_STYLES.body}">
  <div style="padding:40px 32px 0;text-align:center">
    <p style="${BASE_STYLES.eyebrow}">${archiveName.toUpperCase()}</p>
  </div>
  <div style="padding:32px">
    ${bodyHtml}
  </div>
  <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="${BASE_STYLES.footer}">BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.</p>
  </div>
</body>
</html>`
}

// ── Payment failed (day 1) ────────────────────────────────────────────────────

export function buildPaymentFailedSubject(archiveName: string, lang = 'en'): string {
  if (lang === 'zh' || lang === 'yue') return `关于您档案的说明 · ${archiveName}`
  return `A note about your archive · ${archiveName}`
}

export function buildPaymentFailedEmail(
  firstName:  string,
  archiveName: string,
  invoiceUrl:  string,
  lang = 'en',
): string {
  const isZh = lang === 'zh' || lang === 'yue'

  const body = isZh ? `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName}，</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
      我们未能处理您最近的付款。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 8px">
      您的档案是安全的。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      您所建立的一切都完好无损。请更新您的付款信息以继续您的档案。
    </p>
    ${invoiceUrl ? `<a href="${invoiceUrl}" style="${BASE_STYLES.goldBtn}">更新付款方式 →</a>` : ''}
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;line-height:1.8;margin:32px 0 0">
      如果您有任何问题，请回复此邮件。
    </p>
  ` : `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 16px">
      We were unable to process your most recent payment.
    </p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 8px">
      Your archive is safe.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      Everything you have built is intact. Please update your payment information
      to continue your archive without interruption.
    </p>
    ${invoiceUrl ? `<a href="${invoiceUrl}" style="${BASE_STYLES.goldBtn}">Update Payment Method →</a>` : ''}
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;line-height:1.8;margin:32px 0 0">
      If you have any questions reply to this email.
    </p>
  `

  return wrap(archiveName, body)
}

// ── Archive paused (day ~30, after subscription deleted) ──────────────────────

export function buildArchivePausedEmail(
  firstName:   string,
  archiveName: string,
  lang = 'en',
): string {
  const resumeUrl = `${SITE_URL}/resume`

  const body = (lang === 'zh' || lang === 'yue') ? `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName}，</p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 20px">
      您的档案已暂停。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      这不是删除。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      您所建立的一切都是安全的。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      您的照片。您的声音。您的存档。您的贡献者。一切都完好无损。
    </p>
    <a href="${resumeUrl}" style="${BASE_STYLES.goldBtn}">恢复您的档案 →</a>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;line-height:1.8;margin:32px 0 0">
      没有截止日期。您的档案将被保存，直到您回来。
    </p>
  ` : `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 20px">
      Your archive has been paused.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      This is not a deletion.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      Everything you have built is safe.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      Your photographs. Your voice. Your deposits. Your contributors.
      All of it is exactly as you left it.
    </p>
    <a href="${resumeUrl}" style="${BASE_STYLES.goldBtn}">Resume Your Archive →</a>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;line-height:1.8;margin:32px 0 0">
      There is no deadline. Your archive will be preserved until you return.
    </p>
  `

  return wrap(archiveName, body)
}

// ── Paused reminder (every 6 months) ─────────────────────────────────────────

export function buildPausedReminderEmail(
  firstName:    string,
  archiveName:  string,
  monthsPaused: number,
  lang = 'en',
): string {
  const resumeUrl  = `${SITE_URL}/resume`
  const archiveUrl = `${SITE_URL}/archive/dashboard`

  const body = (lang === 'zh' || lang === 'yue') ? `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName}，</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      简短说明。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
      您的档案已保存 ${monthsPaused} 个月。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      一切都完好无损。您的照片。您的声音。您的存档。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      当您准备好回来时，请回复此邮件或访问下面的链接。我们会在这里。
    </p>
    <a href="${resumeUrl}" style="${BASE_STYLES.goldBtn}">返回您的档案 →</a>
  ` : `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      A brief note.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
      Your archive has been preserved for ${monthsPaused} month${monthsPaused !== 1 ? 's' : ''}.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      Everything is exactly as you left it.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      Your photographs. Your voice. Your deposits.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      When you are ready to return reply to this email or visit your archive link below.
      We will be here.
    </p>
    <a href="${resumeUrl}" style="${BASE_STYLES.goldBtn}">Return to Your Archive →</a>
  `

  return wrap(archiveName, body)
}

// ── Welcome back (after resume payment) ──────────────────────────────────────

export function buildWelcomeBackEmail(
  firstName:   string,
  archiveName: string,
  lang = 'en',
): string {
  const archiveUrl = `${SITE_URL}/archive/dashboard`

  const body = (lang === 'zh' || lang === 'yue') ? `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName}，</p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 20px">
      您的档案已重新激活。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      您建立的一切仍在这里。
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      您的照片。您的声音。您的存档。您的贡献者。实体已准备好从上次停下来的地方继续学习。
    </p>
    <a href="${archiveUrl}" style="${BASE_STYLES.goldBtn}">进入您的档案 →</a>
  ` : `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 20px">
      Your archive is active again.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 8px">
      Everything you built is still here.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      Your photographs. Your voice. Your deposits. Your contributors.
      The entity is ready to continue learning exactly where it left off.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      Welcome back.
    </p>
    <a href="${archiveUrl}" style="${BASE_STYLES.goldBtn}">Enter Your Archive →</a>
  `

  return wrap(archiveName, body)
}

// ── Termination confirmation ──────────────────────────────────────────────────

export function buildTerminationEmail(
  firstName:       string,
  archiveName:     string,
  deletionDate:    string,
  lang = 'en',
): string {
  const body = `
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 24px">
      We have received your request to permanently close your archive.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 8px">
      Your archive will be permanently deleted on ${deletionDate}.
    </p>
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0 0 32px">
      If you change your mind before then, reply to this email and we will cancel the deletion.
      Your archive will remain intact until that date.
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;line-height:1.8;margin:0">
      Reply to this email at any time to cancel.
    </p>
  `

  return wrap(archiveName, body)
}
