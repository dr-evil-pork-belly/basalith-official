/**
 * Audits the email reply loop and triggers daily-reflection for a single archive.
 * Run: npx tsx scripts/audit-reply-loop.ts
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const resendApiKey = process.env.RESEND_API_KEY!
const fromEmail    = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
const replyDomain  = process.env.RESEND_REPLY_DOMAIN ?? 'reply.basalith.ai'

const supabase = createClient(supabaseUrl, supabaseKey)
const resend   = new Resend(resendApiKey)

const TARGET_ARCHIVE_ID = 'a38e4503-c7d2-4af3-af8c-cacd66974e0b'

// ── Helper: generate token ────────────────────────────────────────────────────

function generateToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Helper: day of year ───────────────────────────────────────────────────────

function getDayOfYear(): number {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Inline reflection library (English subset for audit) ─────────────────────

const DIMS: Record<string, string[]> = {
  wisdom_and_lessons: [
    "What is the best advice you ever received and who gave it?",
    "What do you know now that you wish you had known at 25?",
    "What mistake do you see young people make that you learned to avoid?",
    "What has surprised you most about getting older?",
    "What is something that seemed important when you were young that does not matter at all now?",
    "What is the most valuable thing you own that has no monetary value?",
    "What would you tell your 20-year-old self?",
    "What have you changed your mind about as you have gotten older?",
    "What is the secret to a long and happy life?",
    "What do you want your grandchildren to understand about how to live?",
  ],
  early_life: [
    "Describe the house you grew up in. Not what it looked like — what it smelled like on a normal Tuesday morning.",
    "What was the view from your childhood bedroom window?",
    "What did your family eat for breakfast when you were young? Who cooked it?",
  ],
  core_values: [
    "What is something you believe that most people around you do not?",
    "Describe a time you did the right thing when it cost you something.",
    "What line have you never crossed — not because you were told not to but because you simply could not?",
  ],
}

function getQuestion(dimension: string, dayOfYear: number): string {
  const questions = DIMS[dimension] ?? DIMS['wisdom_and_lessons']
  return questions[dayOfYear % questions.length]
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildEmail(archiveName: string, firstName: string, question: string, phoneNumber: string): string {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0">TODAY'S QUESTION · ${dateStr.toUpperCase()}</p>
  </div>
  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:20px 24px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0;font-style:italic">"${question}"</p>
    </div>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#B8B4AB;margin:0 0 16px">Answer by calling:</p>
    <div style="background:rgba(196,162,74,0.06);border:1px solid rgba(196,162,74,0.2);padding:20px 24px;margin:0 0 24px">
      <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">CALL TO RECORD YOUR ANSWER</p>
      <p style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F0EDE6;margin:0 0 4px;letter-spacing:2px">${phoneNumber}</p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0">Speak in any language. No login needed.</p>
    </div>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 8px;text-align:center">Or reply to this email with your answer.</p>
    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;text-align:center;margin-top:24px">
      <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;margin:0">Your stories are worth keeping.</p>
    </div>
  </div>
  <div style="padding:0 32px 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">BASALITH · XYZ<br>${archiveName}<br>Heritage Nexus Inc.</p>
  </div>
</body>
</html>`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════')
  console.log('  BASALITH REPLY LOOP AUDIT')
  console.log('══════════════════════════════════════════\n')

  // ── 1. Query email_reply_sessions ─────────────────────────────────────────
  console.log('── email_reply_sessions (last 10) ──────────\n')
  const { data: sessions, error: sessErr } = await supabase
    .from('email_reply_sessions')
    .select('email_type, replied, replied_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (sessErr) {
    console.error('Query error:', sessErr.message)
  } else if (!sessions?.length) {
    console.log('  (no rows)')
  } else {
    console.log('  email_type        | replied | replied_at                  | created_at')
    console.log('  ──────────────────────────────────────────────────────────────────────')
    for (const s of sessions) {
      const type      = (s.email_type ?? '').padEnd(17)
      const replied   = String(s.replied).padEnd(7)
      const repliedAt = (s.replied_at ?? 'null').substring(0, 24).padEnd(28)
      const createdAt = (s.created_at ?? '').substring(0, 24)
      console.log(`  ${type} | ${replied} | ${repliedAt} | ${createdAt}`)
    }
  }

  // ── 2. Trigger daily-reflection for target archive ────────────────────────
  console.log('\n── Triggering daily-reflection for David Ha ─\n')

  const { data: archive, error: archErr } = await supabase
    .from('archives')
    .select('id, name, family_name, owner_name, owner_email, preferred_language, status')
    .eq('id', TARGET_ARCHIVE_ID)
    .single()

  if (archErr || !archive) {
    console.error('Archive fetch failed:', archErr?.message ?? 'not found')
    return
  }

  console.log(`  Archive : ${archive.name}`)
  console.log(`  Owner   : ${archive.owner_name}`)
  console.log(`  Email   : ${archive.owner_email}`)
  console.log(`  Lang    : ${archive.preferred_language}`)
  console.log(`  Status  : ${archive.status}`)

  // Weakest dimension
  const { data: accuracy } = await supabase
    .from('entity_accuracy')
    .select('dimension, accuracy_score')
    .eq('archive_id', TARGET_ARCHIVE_ID)
    .order('accuracy_score', { ascending: true })
    .limit(3)

  const dayOfYear          = getDayOfYear()
  const weakestDimension   = accuracy?.[dayOfYear % 3]?.dimension ?? 'wisdom_and_lessons'
  const question           = getQuestion(weakestDimension, dayOfYear)
  const firstName          = archive.owner_name?.split(' ')[0] ?? 'there'
  const twilioNumber       = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER ?? '1-888-688-9168'
  const formattedPhone     = twilioNumber.replace(/\+1(\d{3})(\d{3})(\d{4})/, '1-$1-$2-$3') || '1-888-688-9168'

  console.log(`\n  Day of year     : ${dayOfYear}`)
  console.log(`  Weakest dim     : ${weakestDimension}`)
  console.log(`  Question        : "${question}"`)
  console.log(`  Accuracy rows   : ${accuracy?.length ?? 0}`)
  if (accuracy?.length) {
    for (const a of accuracy) {
      console.log(`    ${a.dimension.padEnd(28)} ${a.accuracy_score}`)
    }
  }

  // Create reply session
  const token    = generateToken()
  const replyTo  = `reply+${token}@${replyDomain}`
  const subject  = `Today's question · ${archive.name}`

  const { error: insertErr } = await supabase.from('email_reply_sessions').insert({
    token,
    archive_id:     TARGET_ARCHIVE_ID,
    contributor_id: null,
    email_type:     'owner_daily',
    spark_id:       question.substring(0, 200),
    prompt_id:      null,
    photograph_id:  null,
  })

  if (insertErr) {
    console.error('\n  [ERROR] Session insert failed:', insertErr.message)
    console.error('  Email will be sent WITHOUT a valid reply token.')
  } else {
    console.log(`\n  Session token   : ${token}`)
    console.log(`  Reply address   : ${replyTo}`)
  }

  // Send email
  const html = buildEmail(archive.name, firstName, question, formattedPhone)
  const { data: emailData, error: emailErr } = await resend.emails.send({
    from:    `${archive.name} <${fromEmail}>`,
    to:      archive.owner_email,
    replyTo: insertErr ? undefined : replyTo,
    subject,
    html,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
      'X-Entity-Ref-ID':  `basalith-audit-${TARGET_ARCHIVE_ID}-${Date.now()}`,
      'Precedence':       'bulk',
    },
  })

  if (emailErr) {
    console.error('\n  [ERROR] Email send failed:', emailErr)
  } else {
    console.log(`\n  Email sent      : ${emailData?.id}`)
    console.log(`  To              : ${archive.owner_email}`)
    console.log(`  Subject         : ${subject}`)
    console.log(`  replyTo         : ${insertErr ? '(none — session insert failed)' : replyTo}`)
  }

  console.log('\n══════════════════════════════════════════\n')
}

main().catch(console.error)
