import { NextResponse } from 'next/server'

export async function GET() {
  const replyDomain = process.env.RESEND_REPLY_DOMAIN || 'zoibrenae.resend.app'

  return NextResponse.json({
    replyDomain,
    fromEmail:               process.env.RESEND_FROM_EMAIL  || 'NOT SET',
    resendConfigured:        !!process.env.RESEND_API_KEY,
    webhookSecretConfigured: !!process.env.RESEND_WEBHOOK_SECRET,
    supabaseConfigured:      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    inngestConfigured:       !!process.env.INNGEST_EVENT_KEY,
    sampleReplyAddress:      `morrison-test123@${replyDomain}`,
  })
}
