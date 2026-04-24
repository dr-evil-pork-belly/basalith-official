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

// Escape XML special characters so dynamic strings never break TwiML.
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
  console.log('[twilio/voice] ===START===')

  try {
    const formData = await req.formData()
    const params   = Object.fromEntries(formData.entries()) as Record<string, string>

    const from    = params['From']    ?? ''
    const callSid = params['CallSid'] ?? ''

    console.log('[twilio/voice] from:', from)
    console.log('[twilio/voice] callSid:', callSid)

    // Validation check — log result so we know if it silently rejects.
    const valid = validateTwilioRequest(req, params)
    console.log('[twilio/voice] signature valid:', valid)
    if (!valid) {
      console.error('[twilio/voice] REJECTED — signature mismatch, returning Hangup')
      return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`)
    }

    const siteUrl      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const recordingBase = `${siteUrl}/api/twilio/recording`

    // ── 1. Check archives table (owner) ──────────────────────────────────────────
    console.log('[twilio/voice] querying archives for owner_phone:', from)
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('archives')
      .select('id, name, family_name, owner_name, owner_email, status, preferred_language')
      .eq('owner_phone', from)
      .eq('status', 'active')
      .maybeSingle()

    console.log('[twilio/voice] archive:', archive?.id ?? 'NOT FOUND')
    console.log('[twilio/voice] archive error:', archiveError?.message ?? 'none')
    console.log('[twilio/voice] preferred_language:', archive?.preferred_language ?? 'null')
    console.log('[twilio/voice] owner_name:', archive?.owner_name ?? 'null')
    console.log('[twilio/voice] isZh:', archive?.preferred_language === 'zh')

    if (archive) {
      const firstName = xmlSafe((archive.owner_name ?? 'there').split(' ')[0])
      const action    = buildActionUrl(recordingBase, { archiveId: archive.id, isOwner: 'true' })
      const isZh      = archive.preferred_language === 'zh'

      console.log('[twilio/voice] isZh final:', isZh, '— building', isZh ? 'CHINESE' : 'ENGLISH', 'TwiML')

      let twiml: string

      if (isZh) {
        // No voice attribute for Chinese — Twilio default handles CJK better than alice.
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Zhiyu">您好，${firstName}。请在提示音后说话。说完后按任意键。</Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="1234567890*#"
    timeout="5"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="Polly.Zhiyu">未收到录音。请稍后再次拨打。再见。</Say>
  <Hangup/>
</Response>`
      } else {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome, ${firstName}.</Say>
  <Pause length="1"/>
  <Say voice="alice">You are adding to your archive.</Say>
  <Pause length="1"/>
  <Say voice="alice">Please share a memory, a story, or anything you want preserved.</Say>
  <Pause length="1"/>
  <Say voice="alice">Speak after the tone. Press any key when you are finished.</Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="1234567890*#"
    timeout="5"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="alice">We did not receive a recording. Please call back to try again. Goodbye.</Say>
  <Hangup/>
</Response>`
      }

      console.log('[twilio/voice] TwiML response:')
      console.log(twiml)
      return twimlResponse(twiml)
    }

    // ── 2. Check contributors table ───────────────────────────────────────────────
    console.log('[twilio/voice] not an owner — checking contributors for phone:', from)
    const { data: contributor } = await supabaseAdmin
      .from('contributors')
      .select('id, name, archive_id, archives(name, family_name)')
      .eq('phone', from)
      .eq('status', 'active')
      .maybeSingle()

    console.log('[twilio/voice] contributor:', contributor?.id ?? 'NOT FOUND')

    if (contributor) {
      const { data: questions } = await supabaseAdmin
        .from('contributor_questions')
        .select('id, question_text')
        .eq('contributor_id', contributor.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)

      const question     = questions?.[0] ?? null
      const archiveName  = xmlSafe((contributor as any).archives?.name ?? 'your archive')
      const firstName    = xmlSafe((contributor.name ?? 'there').split(' ')[0])
      const questionText = xmlSafe(
        question?.question_text
          ?? 'Tell me a memory that matters to you. It can be about anything. A moment, a person, a place.'
      )

      const action = buildActionUrl(recordingBase, {
        contributorId: contributor.id,
        questionId:    question?.id ?? '',
        archiveId:     contributor.archive_id,
      })

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome, ${firstName}.</Say>
  <Pause length="1"/>
  <Say voice="alice">You are recording for ${archiveName}.</Say>
  <Pause length="1"/>
  <Say voice="alice">Here is your question.</Say>
  <Pause length="1"/>
  <Say voice="alice">${questionText}</Say>
  <Pause length="2"/>
  <Say voice="alice">Please speak your answer after the tone.</Say>
  <Pause length="1"/>
  <Say voice="alice">Take as long as you need. Press any key when you are finished.</Say>
  <Record
    action="${action}"
    method="POST"
    maxLength="300"
    finishOnKey="1234567890*#"
    timeout="5"
    playBeep="true"
    transcribe="false"
  />
  <Say voice="alice">We did not receive a recording. Please call back to try again. Goodbye.</Say>
  <Hangup/>
</Response>`

      console.log('[twilio/voice] TwiML response:')
      console.log(twiml)
      return twimlResponse(twiml)
    }

    // ── 3. Unknown caller ─────────────────────────────────────────────────────────
    console.log('[twilio/voice] unknown caller — returning generic greeting')
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, and thank you for calling Basalith.</Say>
  <Pause length="1"/>
  <Say voice="alice">We were not able to find your phone number in our records.</Say>
  <Pause length="1"/>
  <Say voice="alice">To get started, please ask the person who invited you to add your number to your profile.</Say>
  <Pause length="1"/>
  <Say voice="alice">Once they do, you are welcome to call back. Take care.</Say>
  <Hangup/>
</Response>`

    console.log('[twilio/voice] TwiML response:')
    console.log(twiml)
    return twimlResponse(twiml)

  } catch (err: unknown) {
    console.error('[twilio/voice] CRASH:', err instanceof Error ? err.message : err)
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">We encountered an error. Please call back in a moment.</Say><Hangup/></Response>`)
  }
}
