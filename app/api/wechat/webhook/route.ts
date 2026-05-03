import { NextRequest } from 'next/server'
import { parseStringPromise } from 'xml2js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createTrainingPairFromDeposit } from '@/lib/trainingPipeline'
import { verifyWeChatSignature, buildTextReply, xmlResponse } from '@/lib/wechat'

export const dynamic = 'force-dynamic'

const TOKEN = process.env.WECHAT_TOKEN ?? ''

// ── GET: WeChat server verification ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const p         = new URL(req.url).searchParams
  const signature = p.get('signature') ?? ''
  const timestamp = p.get('timestamp') ?? ''
  const nonce     = p.get('nonce')     ?? ''
  const echostr   = p.get('echostr')   ?? ''

  if (verifyWeChatSignature(TOKEN, timestamp, nonce, signature)) {
    return new Response(echostr, { headers: { 'Content-Type': 'text/plain' } })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── POST: incoming messages ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const p         = new URL(req.url).searchParams
  const signature = p.get('signature') ?? ''
  const timestamp = p.get('timestamp') ?? ''
  const nonce     = p.get('nonce')     ?? ''

  if (!verifyWeChatSignature(TOKEN, timestamp, nonce, signature)) {
    return new Response('Forbidden', { status: 403 })
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return new Response('success')
  }

  let msg: Record<string, string[]>
  try {
    const parsed = await parseStringPromise(rawBody, { explicitArray: true })
    msg = parsed.xml as Record<string, string[]>
  } catch {
    return new Response('success')
  }

  const toUser   = msg.ToUserName?.[0]              ?? ''
  const fromUser = msg.FromUserName?.[0]            ?? ''
  const msgType  = (msg.MsgType?.[0] ?? '').toLowerCase()
  const event    = (msg.Event?.[0]   ?? '').toLowerCase()

  // Look up archive and contributor by openId
  const [{ data: archive }, { data: contributor }] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('id, name, owner_name, preferred_language')
      .eq('wechat_open_id', fromUser)
      .maybeSingle(),
    supabaseAdmin
      .from('contributors')
      .select('id, name, archive_id')
      .eq('wechat_open_id', fromUser)
      .maybeSingle(),
  ])

  const isLinked  = !!(archive || contributor)
  const archiveId = archive?.id ?? contributor?.archive_id ?? null

  // ── Subscribe event ────────────────────────────────────────────────────────
  if (msgType === 'event' && event === 'subscribe') {
    const welcomeText = archive
      ? `Welcome back to ${archive.name}. Send a voice message or text to add a memory to your archive.`
      : `Welcome to Basalith. To connect this account to your family archive, reply with your 6-character link code. Find it at basalith.xyz on your archive dashboard.`
    return xmlResponse(buildTextReply(fromUser, toUser, welcomeText))
  }

  // ── Text messages ──────────────────────────────────────────────────────────
  if (msgType === 'text') {
    const content = (msg.Content?.[0] ?? '').trim()

    if (!isLinked) {
      // Check if it looks like a link code
      const code = content.toUpperCase()
      if (/^[A-Z0-9]{6}$/.test(code)) {
        const { data: linked } = await supabaseAdmin
          .from('archives')
          .select('id, name')
          .eq('wechat_link_code', code)
          .maybeSingle()

        if (!linked) {
          return xmlResponse(buildTextReply(fromUser, toUser, `Code not recognised. Check your link code at basalith.xyz and try again.`))
        }

        await supabaseAdmin
          .from('archives')
          .update({ wechat_open_id: fromUser })
          .eq('id', linked.id)

        return xmlResponse(buildTextReply(fromUser, toUser, `Linked to ${linked.name}. You can now send voice messages and memories directly here.`))
      }

      return xmlResponse(buildTextReply(fromUser, toUser, `To link your archive, reply with your 6-character link code from basalith.xyz`))
    }

    if (!archiveId) return new Response('success')

    void saveWeChatDeposit(archiveId, 'What is on your mind?', content)
    return xmlResponse(buildTextReply(fromUser, toUser, 'Your memory has been saved.'))
  }

  // ── Voice messages ─────────────────────────────────────────────────────────
  if (msgType === 'voice') {
    if (!isLinked || !archiveId) {
      return xmlResponse(buildTextReply(fromUser, toUser, `To link your archive, reply with your 6-character link code from basalith.xyz`))
    }

    const recognition = (msg.Recognition?.[0] ?? '').trim()

    if (recognition) {
      void saveWeChatDeposit(archiveId, 'Tell me a memory.', recognition)
      return xmlResponse(buildTextReply(fromUser, toUser, 'Your voice memory has been saved.'))
    }

    return xmlResponse(buildTextReply(fromUser, toUser, 'Voice received. Enable voice recognition in WeChat for transcription.'))
  }

  // ── Image messages ─────────────────────────────────────────────────────────
  if (msgType === 'image') {
    if (!isLinked) {
      return xmlResponse(buildTextReply(fromUser, toUser, `To link your archive, reply with your 6-character link code from basalith.xyz`))
    }
    return xmlResponse(buildTextReply(fromUser, toUser, 'Photo received. Visit basalith.xyz to add memories to your archive.'))
  }

  // Unhandled — return empty success so WeChat does not show an error
  return new Response('success')
}

// ── Save deposit + fire training pair ────────────────────────────────────────

async function saveWeChatDeposit(
  archiveId: string,
  prompt:    string,
  response:  string,
): Promise<void> {
  try {
    const { data: deposit } = await supabaseAdmin
      .from('owner_deposits')
      .insert({ archive_id: archiveId, prompt, response, essence_status: 'pending' })
      .select('id')
      .single()

    if (!deposit?.id) return

    void (async () => {
      try {
        const { data: arch } = await supabaseAdmin
          .from('archives')
          .select('owner_name, name, preferred_language')
          .eq('id', archiveId)
          .single()
        if (!arch) return
        await createTrainingPairFromDeposit(
          { id: deposit.id, archive_id: archiveId, prompt, response },
          arch.owner_name || 'Unknown',
          arch.name,
          arch.preferred_language || 'en',
        )
      } catch (e) {
        console.warn('[wechat] training pair failed:', e instanceof Error ? e.message : e)
      }
    })()
  } catch (e) {
    console.error('[wechat] saveWeChatDeposit failed:', e instanceof Error ? e.message : e)
  }
}
