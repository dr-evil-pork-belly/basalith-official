import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ElevenLabsClient } from 'elevenlabs'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

const anthropic = new Anthropic()

function buildPersonSystemPrompt(ownerName: string, archiveName: string): string {
  return `You are ${ownerName}. You think, speak, and reason exactly as ${ownerName} does.
You answer from your own lived experience. You use your natural vocabulary and cadence.
You never break character. You never say you are an AI. You speak in first person always.
This is ${archiveName}.`
}

function validateCronAuth(req: NextRequest): boolean {
  const { searchParams } = new URL(req.url)
  const secret   = searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '') || ''
  const expected = process.env.CRON_SECRET || ''
  return !!expected && secret === expected
}

function getLanguageInstruction(lang: string): string {
  switch (lang) {
    case 'yue': return `Write ENTIRELY in spoken Cantonese (廣東話/粵語).

CRITICAL: This must be written in Cantonese dialect — NOT Mandarin (普通話). These are different languages.

Use authentic Cantonese:
- Cantonese particles: 囉、喇、㗎、呀、咋、喎、㗎咋、囉喎
- Cantonese pronouns: 我、你、佢、我哋、你哋、佢哋
- Cantonese words NOT Mandarin:
  食 (eat, not 吃)
  唔係 (not, not 不是)
  係 (yes/is, not 是)
  點解 (why, not 为什么)
  幾時 (when, not 什么时候)
  好靚 (beautiful, not 很漂亮)
  唔好 (don't, not 不要)
  返屋企 (go home, not 回家)

Example of CORRECT Cantonese:
"你哋好嗎？媽媽係度想你哋囉。今日天氣好好，我出去行吓囉。你哋要食好啲㗎，唔好唔食早餐。"

Example of WRONG (Mandarin — do not write like this):
"你们好吗？妈妈在这里想你们。"

Write as an elderly Cantonese woman from Hong Kong or Guangdong speaking naturally to her children.
Use Traditional Chinese characters. Write 100-150 words.`
    case 'zh':  return 'Write entirely in Mandarin Chinese (普通话). Use Simplified Chinese characters.'
    case 'ja':  return 'Write entirely in polite Japanese (丁寧語).'
    case 'ko':  return 'Write entirely in Korean.'
    case 'es':  return 'Write entirely in Spanish.'
    case 'vi':  return 'Write entirely in Vietnamese.'
    default:    return 'Write in English.'
  }
}

function buildScriptSystemPrompt(ownerName: string, archiveName: string, lang: string): string {
  if (lang === 'yue') {
    return `你係緊係幫 ${ownerName} 生成一段語音留言。
你必須只用廣東話 (粵語) 寫，唔可以用普通話。
廣東話同普通話係兩種唔同嘅語言。
用真正嘅廣東口語詞彙同語氣助詞。
你係 ${ownerName}，用第一人稱廣東話講嘢。
This is ${archiveName}.`
  }
  return `You are ${ownerName}. You think, speak, and reason exactly as ${ownerName} does.
You answer from your own lived experience. You use your natural vocabulary and cadence.
You never break character. You never say you are an AI. You speak in first person always.
This is ${archiveName}.`
}

function getLangLabel(lang: string): string {
  const map: Record<string, string> = { yue: 'Cantonese', zh: 'Mandarin', ja: 'Japanese', ko: 'Korean', es: 'Spanish', vi: 'Vietnamese', en: 'English' }
  return map[lang] ?? lang
}

function getElevenLabsLangCode(lang: string): string {
  // eleven_multilingual_v2 uses ISO 639-1 codes; Cantonese uses zh
  const map: Record<string, string> = { yue: 'zh', zh: 'zh', ja: 'ja', ko: 'ko', es: 'es', vi: 'vi' }
  return map[lang] ?? 'en'
}

function buildPortraitEmail(
  archiveName: string,
  firstName:   string,
  scriptText:  string,
  audioUrl:    string,
  month:       string,
): string {
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:32px">
  <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">${archiveName.toUpperCase()}</p>
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0 0 28px">VOICE PORTRAIT · ${monthLabel.toUpperCase()}</p>
  <p style="font-family:Georgia,serif;font-size:17px;font-weight:300;color:#B8B4AB;margin:0 0 20px">${firstName},</p>
  <p style="font-family:Georgia,serif;font-size:16px;font-weight:300;color:#F0EDE6;line-height:1.7;margin:0 0 24px">
    The entity left you a message this month.
  </p>
  <div style="margin:0 0 28px;text-align:center">
    <a href="${audioUrl}" style="display:inline-block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:12px;letter-spacing:3px;text-decoration:none;padding:16px 32px;border-radius:2px">
      ▶ LISTEN NOW
    </a>
  </div>
  <div style="border-left:3px solid rgba(196,162,74,0.2);padding:20px 24px;margin:0 0 32px;background:rgba(196,162,74,0.03)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;margin:0 0 12px">TRANSCRIPT</p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.8;margin:0;white-space:pre-line">${scriptText}</p>
  </div>
  <p style="font-family:Georgia,serif;font-size:13px;font-style:italic;color:#5C6166;line-height:1.7;margin:0 0 24px">
    This was generated by the entity based on what it has learned.
    The voice is the archive owner's voice.
    The more they contribute the more accurately it speaks.
  </p>
  <hr style="border:none;border-top:1px solid rgba(240,237,230,0.06);margin:0 0 20px">
  <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#5C6166;line-height:1.8;margin:0">BASALITH · XYZ<br>${archiveName}</p>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  if (!validateCronAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isTest = searchParams.get('test') === 'true'
  const force  = searchParams.get('force') === 'true'

  if (!isTest && !force && new Date().getUTCDate() !== 15) {
    return Response.json({ skipped: true, reason: 'Not the 15th' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return Response.json({ skipped: true, reason: 'ELEVENLABS_API_KEY not set' })

  const client  = new ElevenLabsClient({ apiKey })
  const month   = new Date().toISOString().substring(0, 7)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, owner_name, owner_email, preferred_language, elevenlabs_voice_id')
    .eq('status', 'active')
    .not('elevenlabs_voice_id', 'is', null)

  let sent = 0
  const skipped: string[] = []

  for (const archive of archives ?? []) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('voice_portraits')
        .select('id')
        .eq('archive_id', archive.id)
        .eq('month', month)
        .maybeSingle()

      if (existing && !force) { skipped.push(archive.name); continue }

      const { data: deposits } = await supabaseAdmin
        .from('owner_deposits')
        .select('response')
        .eq('archive_id', archive.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const firstName      = archive.owner_name?.split(' ')[0] ?? 'there'
      const lang           = archive.preferred_language ?? 'en'
      const langInstruction = getLanguageInstruction(lang)
      const langLabel      = getLangLabel(lang)
      const depositContext = (deposits ?? []).map(d => d.response.substring(0, 100)).join('\n')

      // Generate script in the archive owner's language
      const scriptRes = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 300,
        system:     buildScriptSystemPrompt(archive.owner_name ?? 'the archive owner', archive.name, lang),
        messages: [{
          role:    'user',
          content: `${langInstruction}

Based on recent deposits and what the entity knows about ${firstName}:
${depositContext || 'Draw on general personal warmth and wisdom.'}

The message should:
- Feel like a natural voice message someone would leave on WhatsApp
- Be warm and personal
- Sound exactly like ${firstName} based on their deposits
- End with something specific and personal to their family

Return only the message text. No preamble. No translation.${lang === 'yue' ? '\nRemember: Cantonese (廣東話) ONLY — not Mandarin (普通話).' : `\nWrite only in ${langLabel}.`}`,
        }],
      })

      const scriptText = scriptRes.content[0].type === 'text' ? scriptRes.content[0].text.trim() : ''
      if (!scriptText) { skipped.push(`${archive.name} (script failed)`); continue }

      console.log(`[voice-portrait] ${archive.name} — lang:${lang}, script length:${scriptText.length}`)

      // Generate audio with language-aware settings
      const audioStream = await client.textToSpeech.convert(archive.elevenlabs_voice_id!, {
        text:           scriptText,
        model_id:       'eleven_multilingual_v2',
        language_code:  getElevenLabsLangCode(lang),
        voice_settings: {
          stability:          0.5,
          similarity_boost:   0.85,  // Higher for cloned voice fidelity
          style:              0.2,
          use_speaker_boost:  true,
        },
      })

      // Collect stream into buffer
      const chunks: Uint8Array[] = []
      for await (const chunk of audioStream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
      }
      const audioBuffer = Buffer.concat(chunks)

      const audioPath = `${archive.id}/portraits/${month}.mp3`
      await supabaseAdmin.storage
        .from('voice-recordings')
        .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

      const { data: portrait } = await supabaseAdmin.from('voice_portraits').insert({
        archive_id:  archive.id,
        script_text: scriptText,
        audio_path:  audioPath,
        month,
      }).select('id').single()

      const { data: signed } = await supabaseAdmin.storage
        .from('voice-recordings')
        .createSignedUrl(audioPath, 60 * 60 * 24 * 30)

      const audioUrl = signed?.signedUrl ?? `${siteUrl}/archive/voice`

      const { data: contributors } = await supabaseAdmin
        .from('contributors')
        .select('id, name, email, preferred_language')
        .eq('archive_id', archive.id)
        .eq('status', 'active')
        .not('email', 'is', null)

      for (const c of contributors ?? []) {
        const cName = (c.name ?? '').split(' ')[0] || 'there'
        await resend.emails.send({
          from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
          to:      c.email,
          subject: `A message from ${firstName} · ${new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          html:    buildPortraitEmail(archive.name, cName, scriptText, audioUrl, month),
          headers: { 'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>', 'Precedence': 'bulk' },
        }).catch(() => {})
      }

      if (portrait) {
        await supabaseAdmin.from('voice_portraits').update({ sent_to_contributors: true, sent_at: new Date().toISOString() }).eq('id', portrait.id)
      }

      sent++
    } catch (err: any) {
      console.error(`[voice-portrait] ${archive.id}:`, err.message)
      skipped.push(`${archive.name} (error: ${err.message})`)
    }
  }

  return Response.json({ sent, total: archives?.length ?? 0, skipped })
}
