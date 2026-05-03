/**
 * WeChat Official Account utilities.
 *
 * Required env vars:
 *   WECHAT_APP_ID
 *   WECHAT_APP_SECRET
 *   WECHAT_TOKEN         — set when configuring the server in mp.weixin.qq.com
 *   WECHAT_ENCODING_AES_KEY — from mp.weixin.qq.com (safe mode, optional)
 */

import crypto from 'crypto'

// ── Signature verification ────────────────────────────────────────────────────

export function verifyWeChatSignature(
  token:     string,
  timestamp: string,
  nonce:     string,
  signature: string,
): boolean {
  const hash = crypto
    .createHash('sha1')
    .update([token, timestamp, nonce].sort().join(''))
    .digest('hex')
  return hash === signature
}

// ── Access token (module-level cache — lives for function instance lifetime) ──

let _cachedToken: { token: string; expiresAt: number } | null = null

export async function getWeChatAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt) {
    return _cachedToken.token
  }

  const appId  = process.env.WECHAT_APP_ID     ?? ''
  const secret = process.env.WECHAT_APP_SECRET  ?? ''

  if (!appId || !secret) {
    throw new Error('WECHAT_APP_ID or WECHAT_APP_SECRET not set')
  }

  const res  = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`)
  const data = await res.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string }

  if (!data.access_token) {
    throw new Error(`WeChat token error: ${data.errmsg ?? JSON.stringify(data)}`)
  }

  _cachedToken = {
    token:     data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 7200) - 300) * 1000,
  }
  return _cachedToken.token
}

// ── Send text message to a user ───────────────────────────────────────────────

export async function sendWeChatText(openId: string, text: string): Promise<void> {
  const token = await getWeChatAccessToken()
  const res   = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ touser: openId, msgtype: 'text', text: { content: text } }),
    },
  )
  const data = await res.json() as { errcode: number; errmsg: string }
  if (data.errcode !== 0) {
    console.error('[wechat] sendText failed:', data.errmsg, 'openId:', openId)
  }
}

// ── Send photo as text message with public URL ────────────────────────────────
// WeChat image messages require uploading to temp media; using URL in text is
// simpler for now. Users can tap the URL to view the photo.

export async function sendWeChatPhoto(
  openId:      string,
  photoUrl:    string,
  archiveName: string,
  lang:        string,
): Promise<void> {
  const captions: Record<string, string> = {
    yue: `你認識呢個時刻嗎？\n用聲音或者文字告訴我你記得咩。`,
    zh:  `您认识这个时刻吗？\n用声音或文字告诉我您记得什么。`,
    ja:  `この瞬間を覚えていますか？\n声や文字で記憶を教えてください。`,
    es:  `¿Reconoce este momento?\nResponda con su recuerdo.`,
    ko:  `이 순간을 기억하시나요?\n음성이나 문자로 기억을 알려주세요.`,
    vi:  `Bạn có nhận ra khoảnh khắc này không?\nHãy chia sẻ ký ức của bạn.`,
  }
  const caption = captions[lang] ?? `Do you remember this moment?\nReply with your memory.`
  await sendWeChatText(openId, `${caption}\n\n${photoUrl}`)
}

// ── XML reply helpers ─────────────────────────────────────────────────────────

export function buildTextReply(toUser: string, fromUser: string, content: string): string {
  return `<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`
}

export function xmlResponse(content: string): Response {
  return new Response(content, { headers: { 'Content-Type': 'application/xml' } })
}

// ── Link code generator ───────────────────────────────────────────────────────

export function generateLinkCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
