import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

function buildPersonSystemPrompt(ownerName: string): string {
  return `You are ${ownerName}. You think, speak, and reason exactly as ${ownerName} does.
You answer from your own lived experience. You use your natural vocabulary and cadence.
You never break character. You never say you are an AI. You speak in first person always.`
}

async function generateWisdomResponse(
  archiveId:  string,
  question:   string,
  context:    string,
  ownerName:  string,
): Promise<string> {
  const { data: deposits } = await supabaseAdmin
    .from('owner_deposits')
    .select('prompt, response')
    .eq('archive_id', archiveId)
    .order('created_at', { ascending: false })
    .limit(20)

  const depositContext = (deposits ?? [])
    .map(d => `Q: ${d.prompt}\nA: ${d.response.substring(0, 200)}`)
    .join('\n\n')

  try {
    const res = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      system:     `${buildPersonSystemPrompt(ownerName)}\n\nHere is what you know about how ${ownerName} thinks:\n\n${depositContext || 'Limited context available — draw on general wisdom.'}`,
      messages: [{
        role:    'user',
        content: context ? `${question}\n\nContext: ${context}` : question,
      }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  } catch {
    return ''
  }
}

function buildOwnerNotificationEmail(
  archiveName:       string,
  ownerFirstName:    string,
  contributorName:   string,
  question:          string,
  entityResponse:    string,
  reviewUrl:         string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 20px">${archiveName.toUpperCase()}</p>
  <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 20px">${ownerFirstName},</p>
  <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0 0 28px">
    ${contributorName} asked your entity a real question.
  </p>
  <div style="margin:0 0 24px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0 0 10px">THEIR QUESTION</p>
    <div style="border-left:3px solid rgba(196,162,74,0.4);padding:16px 20px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#F0EDE6;line-height:1.7;margin:0">${question}</p>
    </div>
  </div>
  <div style="margin:0 0 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#C4A24A;margin:0 0 10px">WHAT THE ENTITY SAID</p>
    <div style="border-left:3px solid rgba(196,162,74,0.2);padding:16px 20px">
      <p style="font-family:Georgia,serif;font-size:15px;font-weight:300;color:#B8B4AB;line-height:1.8;margin:0">${entityResponse}</p>
    </div>
  </div>
  <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;line-height:1.7;margin:0 0 24px">
    Does this sound like what you would actually say?
    You can correct it, add to it, or let it stand.
  </p>
  <a href="${reviewUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
    REVIEW THE EXCHANGE →
  </a>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:32px 0 20px">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
    BASALITH · XYZ<br>${archiveName}
  </p>
</body>
</html>`
}

// POST — contributor submits a question
export async function POST(req: NextRequest) {
  try {
    const { token, question, context } = await req.json()
    if (!token || !question?.trim()) {
      return NextResponse.json({ error: 'token and question required' }, { status: 400 })
    }

    const contributor = await getContributorByToken(token)
    if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const archiveId  = contributor.archive_id as string
    const archive    = contributor.archives as { name: string; owner_name: string | null; owner_email: string | null; preferred_language: string | null } | null

    // Insert pending exchange
    const { data: exchange } = await supabaseAdmin
      .from('wisdom_exchanges')
      .insert({
        archive_id:       archiveId,
        contributor_id:   contributor.id,
        question:         question.trim(),
        question_context: context?.trim() || null,
        status:           'pending',
      })
      .select('id')
      .single()

    if (!exchange) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

    // Generate entity response
    const ownerName      = archive?.owner_name ?? 'the archive owner'
    const entityResponse = await generateWisdomResponse(archiveId, question.trim(), context?.trim() ?? '', ownerName)

    if (entityResponse) {
      await supabaseAdmin
        .from('wisdom_exchanges')
        .update({ entity_response: entityResponse, entity_responded_at: new Date().toISOString(), status: 'answered' })
        .eq('id', exchange.id)
    }

    // Notify owner
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    if (archive?.owner_email && entityResponse) {
      resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject: `${contributor.name} asked your entity something · ${archive.name}`,
        html:    buildOwnerNotificationEmail(
          archive.name, ownerName.split(' ')[0],
          contributor.name ?? 'A contributor',
          question.trim(), entityResponse,
          `${siteUrl}/archive/wisdom-exchange`,
        ),
        headers: { 'X-Entity-Ref-ID': `basalith-wisdom-${exchange.id}` },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, exchangeId: exchange.id, entityResponse })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — contributor views approved exchanges
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const contributor = await getContributorByToken(token)
  if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: exchanges } = await supabaseAdmin
    .from('wisdom_exchanges')
    .select('id, question, entity_response, owner_correction, status, created_at')
    .eq('archive_id', contributor.archive_id as string)
    .eq('contributor_id', contributor.id as string)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ exchanges: exchanges ?? [] })
}
