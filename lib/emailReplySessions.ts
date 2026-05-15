import { supabaseAdmin } from './supabase-admin'

export function generateReplyToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function getReplyDomain(): string {
  return process.env.RESEND_REPLY_DOMAIN ?? 'zoibrenae.resend.app'
}

export function buildReplyAddress(token: string): string {
  return `reply+${token}@${getReplyDomain()}`
}

export interface CreateSessionOptions {
  archiveId:     string
  contributorId: string | null
  emailType:     'spark' | 'story_prompt' | 'photograph'
  sparkId?:      string
  promptId?:     string
}

export async function createEmailReplySession(opts: CreateSessionOptions): Promise<string> {
  const token = generateReplyToken()

  await supabaseAdmin.from('email_reply_sessions').insert({
    token,
    archive_id:     opts.archiveId,
    contributor_id: opts.contributorId ?? null,
    email_type:     opts.emailType,
    spark_id:       opts.sparkId   ?? null,
    prompt_id:      opts.promptId  ?? null,
  })

  return token
}
