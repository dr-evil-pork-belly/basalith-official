import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientIP, sanitizedError } from '@/lib/apiSecurity'
import { resend } from '@/lib/resend'

const ONE_HOUR_MS = 60 * 60 * 1000
const WHITE_PAPER_URL = 'https://basalith.xyz'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Public, unauthenticated. Step 9 of the live demo: a Guide collects a
// prospect's email and sends them the Basalith overview. No data is stored.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const { allowed } = checkRateLimit(`demo-whitepaper:${ip}`, 10, ONE_HOUR_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await req.json().catch(() => null)
    const email = body && typeof body.email === 'string' ? body.email.trim().slice(0, 200) : ''

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'

    await resend.emails.send({
      from:    `Basalith <${fromEmail}>`,
      to:      email,
      subject: 'The Basalith White Paper',
      headers: { Precedence: 'bulk' },
      text:
        'You asked to learn more about Basalith.\n\n' +
        'Basalith preserves not just what a person owned, but how they thought, ' +
        'what they weighed, and how they decided. A living archive that becomes ' +
        'a cognitive reference model over time.\n\n' +
        `Read the white paper: ${WHITE_PAPER_URL}\n\n` +
        'Basalith\nHeritage Nexus Inc.',
      html: `<!DOCTYPE html><html><body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:40px 32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">BASALITH</p>
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0 0 28px">THE WHITE PAPER</p>
  <p style="font-size:17px;font-weight:300;color:#F0EDE6;line-height:1.8;margin:0 0 20px">You asked to learn more about Basalith.</p>
  <p style="font-size:15px;font-weight:300;font-style:italic;color:#B8B4AB;line-height:1.85;margin:0 0 32px">Basalith preserves not just what a person owned, but how they thought, what they weighed, and how they decided. A living archive that becomes a cognitive reference model over time.</p>
  <a href="${WHITE_PAPER_URL}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">READ THE WHITE PAPER</a>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:36px 0 0">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:20px 0 0">BASALITH &middot; XYZ<br>Heritage Nexus Inc.</p>
</body></html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizedError(err, 'demo-whitepaper') },
      { status: 500 },
    )
  }
}
