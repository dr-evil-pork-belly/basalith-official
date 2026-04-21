import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contributorId = searchParams.get('contributorId') ?? ''
  const archiveId     = searchParams.get('archiveId')     ?? ''

  const formData = await req.formData()
  const digit    = formData.get('Digits') as string | null

  if (digit !== '1') {
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    Thank you for contributing to the archive. Goodbye.
  </Say>
  <Hangup/>
</Response>`)
  }

  // Get next pending question
  const { data: questions } = await supabaseAdmin
    .from('contributor_questions')
    .select('id, question_text')
    .eq('contributor_id', contributorId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)

  const question = questions?.[0] ?? null

  const questionText = question?.question_text
    ?? 'Tell me another memory that matters to you.'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const action  = `${siteUrl}/api/twilio/recording?contributorId=${contributorId}&questionId=${question?.id ?? ''}&archiveId=${archiveId}`

  return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    Here is your next question: ${questionText}
  </Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">
    Please speak your answer after the tone. Press any key when you are finished.
  </Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="*"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="alice" language="en-US">
    We did not receive a recording. Goodbye.
  </Say>
  <Hangup/>
</Response>`)
}
