import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-admin'
import { resend } from './resend'

const anthropic = new Anthropic()

function buildChainSubject(ownerFirstName: string, lang: string): string {
  const map: Record<string, string> = {
    en:  `Something came up about ${ownerFirstName} — add your perspective`,
    zh:  `关于${ownerFirstName}的问题`,
    yue: `${ownerFirstName}有啲嘢想問你`,
    ja:  `${ownerFirstName}さんについて — あなたの視点を`,
    es:  `Algo surgió sobre ${ownerFirstName} — agrega tu perspectiva`,
    ko:  `${ownerFirstName}에 관한 질문`,
    vi:  `Một câu hỏi về ${ownerFirstName}`,
    tl:  `May tanong tungkol kay ${ownerFirstName}`,
  }
  return map[lang] ?? map.en
}

function buildChainEmail(
  firstName:      string,
  ownerFirstName: string,
  question:       string,
  portalUrl:      string,
): string {
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">
  <div style="padding:32px 32px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">A MEMORY CHAIN</p>
  </div>
  <div style="padding:32px">
    <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 24px">${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0 0 16px">
      Someone who knows ${ownerFirstName} shared something.
      It raised a question only you might be able to answer.
    </p>
    <div style="border-left:3px solid rgba(196,162,74,0.5);padding:24px 28px;margin:0 0 32px;background:rgba(196,162,74,0.04)">
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;font-style:italic;color:#F0EDE6;line-height:1.7;margin:0">
        ${question}
      </p>
    </div>
    <a href="${portalUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;border-radius:2px">
      ADD YOUR PERSPECTIVE →
    </a>
  </div>
  <div style="padding:16px 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">
      BASALITH · XYZ<br>Heritage Nexus Inc.
    </p>
  </div>
</body>
</html>`
}

export async function triggerMemoryChain(
  archiveId:               string,
  answeredByContributorId: string,
  originalQuestion:        string,
  answer:                  string,
  ownerName:               string,
): Promise<void> {
  try {
    // Get up to 2 other active contributors who haven't seen this question
    const { data: others } = await supabaseAdmin
      .from('contributors')
      .select('id, name, email, access_token, preferred_language')
      .eq('archive_id', archiveId)
      .eq('status', 'active')
      .neq('id', answeredByContributorId)
      .limit(2)

    if (!others?.length) return

    const ownerFirstName = ownerName.split(' ')[0]

    // Generate a follow-up question based on the answer
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role:    'user',
        content: `A contributor answered a question about ${ownerName}.

Original question: ${originalQuestion}
Their answer: ${answer.substring(0, 200)}

Generate ONE follow-up question to send to a DIFFERENT contributor based on what was shared.

The follow-up should:
- Reference what was shared without quoting it directly
- Ask the new contributor to confirm, add to, or contrast their own memory
- Be specific to ${ownerFirstName}
- Be 1-2 sentences maximum

Return only the question text.`,
      }],
    })

    const followUpText = res.content[0].type === 'text' ? res.content[0].text.trim() : null
    if (!followUpText) return

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

    for (const contributor of others) {
      const portalUrl = contributor.access_token
        ? `${siteUrl}/contribute/${contributor.access_token}`
        : `${siteUrl}/contribute`
      const firstName = (contributor.name ?? '').split(' ')[0] || 'there'
      const lang      = contributor.preferred_language ?? 'en'

      await resend.emails.send({
        from:    `archive@${process.env.RESEND_FROM_EMAIL?.split('@')[1] ?? 'basalith.xyz'}`,
        to:      contributor.email,
        subject: buildChainSubject(ownerFirstName, lang),
        html:    buildChainEmail(firstName, ownerFirstName, followUpText, portalUrl),
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-chain-${archiveId}-${contributor.id}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      }).catch(e => console.error('[memory-chain] email failed:', e instanceof Error ? e.message : e))
    }
  } catch (err) {
    console.error('[memory-chain] error:', err instanceof Error ? err.message : err)
  }
}
