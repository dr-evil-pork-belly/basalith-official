import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import twilio from 'twilio'

export const dynamic = 'force-dynamic'

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}

function validateTwilioRequest(req: NextRequest, params: Record<string, string>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return true // dev: skip validation

  const signature = req.headers.get('X-Twilio-Signature') ?? ''
  const url       = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'}/api/twilio/voice`
  return twilio.validateRequest(authToken, signature, url, params)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const params   = Object.fromEntries(formData.entries()) as Record<string, string>

  if (!validateTwilioRequest(req, params)) {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
  }

  const from    = params['From']    ?? ''
  const callSid = params['CallSid'] ?? ''

  console.log(`[twilio/voice] Incoming call from ${from} sid=${callSid}`)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

  // ── 1. Check archives table (owner) ──────────────────────────────────────────
  const { data: archiveOwner } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_name, owner_email, status, preferred_language')
    .eq('owner_phone', from)
    .eq('status', 'active')
    .maybeSingle()

  if (archiveOwner) {
    const firstName  = archiveOwner.owner_name?.split(' ')[0] ?? 'there'
    const action     = `${siteUrl}/api/twilio/recording?archiveId=${archiveOwner.id}&isOwner=true`
    const isZh       = archiveOwner.preferred_language === 'zh'

    if (isZh) {
      return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Zhiyu-Neural" language="cmn-CN">
    您好，${firstName}。
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Zhiyu-Neural" language="cmn-CN">
    欢迎来到您的 Basalith 档案。
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Zhiyu-Neural" language="cmn-CN">
    请在提示音后分享您的故事或回忆。
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Zhiyu-Neural" language="cmn-CN">
    说完后请按任意键。
  </Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="Polly.Zhiyu-Neural" language="cmn-CN">
    未收到录音。请稍后再次拨打。再见。
  </Say>
  <Hangup/>
</Response>`)
    }

    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Welcome, ${firstName}.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    You are adding to your archive.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Please share a memory, a story, or anything you want preserved.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Speak after the tone. Press any key when you are finished.
  </Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="Polly.Joanna-Neural" language="en-US">
    We did not receive a recording. Please call back to try again. Goodbye.
  </Say>
  <Hangup/>
</Response>`)
  }

  // ── 2. Check contributors table ───────────────────────────────────────────────
  const { data: contributor } = await supabaseAdmin
    .from('contributors')
    .select('id, name, archive_id, archives(name, family_name)')
    .eq('phone', from)
    .eq('status', 'active')
    .maybeSingle()

  if (contributor) {
    const { data: questions } = await supabaseAdmin
      .from('contributor_questions')
      .select('id, question_text')
      .eq('contributor_id', contributor.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    const question    = questions?.[0] ?? null
    const archiveName = (contributor as any).archives?.name ?? 'your archive'
    const firstName   = contributor.name?.split(' ')[0] ?? 'there'
    const questionText = question?.question_text
      ?? 'Tell me a memory that matters to you. It can be about anything — a moment, a person, a place.'

    const action = `${siteUrl}/api/twilio/recording?contributorId=${contributor.id}&questionId=${question?.id ?? ''}&archiveId=${contributor.archive_id}`

    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Welcome, ${firstName}.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    You are recording for ${archiveName}.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Here is your question.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    ${questionText}
  </Say>
  <Pause length="2"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Please speak your answer after the tone.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Take as long as you need. Press any key when you are finished.
  </Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="Polly.Joanna-Neural" language="en-US">
    We did not receive a recording. Please call back to try again. Goodbye.
  </Say>
  <Hangup/>
</Response>`)
  }

  // ── 3. Unknown caller ─────────────────────────────────────────────────────────
  return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Hello, and thank you for calling Basalith.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    We were not able to find your phone number in our records.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    To get started, please ask the person who invited you to add your number to your profile.
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Once they do, you are welcome to call back. Take care.
  </Say>
  <Hangup/>
</Response>`)
}
