import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}

function xmlSafe(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Build an action URL with & escaped as &amp; for valid XML attributes.
function buildActionUrl(base: string, params: Record<string, string>): string {
  const query = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&amp;')
  return `${base}?${query}`
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contributorId = searchParams.get('contributorId') ?? ''
  const archiveId     = searchParams.get('archiveId')     ?? ''
  const isOwner       = searchParams.get('isOwner') === 'true'

  const formData = await req.formData()
  const digit    = formData.get('Digits') as string | null

  const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const recordingBase = `${siteUrl}/api/twilio/recording`

  const { data: archiveLang } = await supabaseAdmin
    .from('archives')
    .select('preferred_language')
    .eq('id', archiveId)
    .maybeSingle()

  const isZh = archiveLang?.preferred_language === 'zh'

  if (digit !== '1') {
    // No voice attribute for Chinese — Twilio default handles CJK better than alice.
    const twiml = isZh
      ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>谢谢您。再见。</Say>
  <Hangup/>
</Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`

    console.log('[twilio/continue] TwiML response:')
    console.log(twiml)
    return twimlResponse(twiml)
  }

  // Owner — free-form deposit, no question lookup needed
  if (isOwner) {
    const action = buildActionUrl(recordingBase, { archiveId, isOwner: 'true' })

    const twiml = isZh
      ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>请分享另一段回忆。提示音后开始说话，说完后按任意键。</Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say>未收到录音。再见。</Say>
  <Hangup/>
</Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please share another memory.</Say>
  <Pause length="1"/>
  <Say voice="alice">Speak after the tone. Press any key when you are finished.</Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="alice">We did not receive a recording. Goodbye.</Say>
  <Hangup/>
</Response>`

    console.log('[twilio/continue] TwiML response:')
    console.log(twiml)
    return twimlResponse(twiml)
  }

  // Contributor — get next pending question
  const { data: questions } = await supabaseAdmin
    .from('contributor_questions')
    .select('id, question_text')
    .eq('contributor_id', contributorId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  const question     = questions?.[0] ?? null
  const questionText = xmlSafe(
    question?.question_text
      ?? (isZh ? '请分享一段对您来说重要的回忆。' : 'Tell me another memory that matters to you.')
  )

  const action = buildActionUrl(recordingBase, {
    contributorId,
    questionId: question?.id ?? '',
    archiveId,
  })

  const twiml = isZh
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>这是您的下一个问题。</Say>
  <Pause length="1"/>
  <Say>${questionText}</Say>
  <Pause length="2"/>
  <Say>请在提示音后说出您的回答，说完后按任意键。</Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say>未收到录音。再见。</Say>
  <Hangup/>
</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Here is your next question.</Say>
  <Pause length="1"/>
  <Say voice="alice">${questionText}</Say>
  <Pause length="2"/>
  <Say voice="alice">Please speak your answer after the tone. Press any key when you are finished.</Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="alice">We did not receive a recording. Goodbye.</Say>
  <Hangup/>
</Response>`

  console.log('[twilio/continue] TwiML response:')
  console.log(twiml)
  return twimlResponse(twiml)
}
