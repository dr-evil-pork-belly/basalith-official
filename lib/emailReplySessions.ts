import { supabaseAdmin } from './supabase-admin'

/**
 * Reply token lifetime. See supabase/migrations/20260806_email_reply_sessions_expiry.sql
 * for the measurement this is chosen from and the n=14 caveat on it.
 *
 * Changing this changes only newly minted tokens. Rows already in flight carry
 * the expires_at they were written with.
 */
export const REPLY_TOKEN_TTL_DAYS = 30

export function replyTokenExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + REPLY_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export function generateReplyToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function getReplyDomain(): string {
  return process.env.RESEND_REPLY_DOMAIN ?? 'reply.basalith.ai'
}

export function buildReplyAddress(token: string): string {
  return `reply+${token}@${getReplyDomain()}`
}

export interface CreateSessionOptions {
  archiveId:     string
  contributorId: string | null
  emailType:     'spark' | 'story_prompt' | 'photograph' | 'owner_daily' | 'owner_weekly' | 'b2b_question' | 'contributor_question' | 'conversational' | 'mirror'
  sparkId?:      string
  promptId?:     string
  photographId?: string
  /**
   * question_history row this email is serving, when there is one. The inbound
   * handler uses it to attach the reply to the exact question served. Absent on
   * every non-elicitation email type (spark, story_prompt, photograph, etc.).
   */
  questionHistoryId?: number | null
}

export async function createEmailReplySession(opts: CreateSessionOptions): Promise<string> {
  const token = generateReplyToken()

  // expires_at is set explicitly on every mint. The column also carries a
  // database default as a backstop, but the value a token is born with must be
  // decided here, not inferred from wherever the row happened to be written.
  const { error } = await supabaseAdmin.from('email_reply_sessions').insert({
    token,
    archive_id:     opts.archiveId,
    contributor_id: opts.contributorId ?? null,
    email_type:     opts.emailType,
    spark_id:       opts.sparkId      ?? null,
    prompt_id:      opts.promptId     ?? null,
    photograph_id:  opts.photographId ?? null,
    question_history_id: opts.questionHistoryId ?? null,
    expires_at:     replyTokenExpiry(),
  })

  if (error) throw new Error(`email_reply_sessions insert failed: ${error.message}`)

  return token
}

/**
 * The single guard every consumer of a reply token goes through.
 *
 * Returns a discriminated result rather than a nullable row, because the four
 * outcomes are not interchangeable and the old code collapsed three of them
 * into one. In particular a database error used to arrive as `session = null`
 * and was reported as an unknown token, which silently discarded real family
 * replies whenever Postgres hiccuped.
 *
 * Callers must render 'unknown' and 'expired' identically to the outside world.
 * The distinction exists only so an expired token can trigger the courtesy
 * email to an address already on file. See lib/emails/replyExpired.ts.
 */
export type ReplySessionRow = {
  id:                  string
  token:               string
  archive_id:          string
  contributor_id:      string | null
  email_type:          string
  spark_id:            string | null
  prompt_id:           string | null
  photograph_id:       string | null
  question_history_id: number | null
  replied:             boolean
  created_at:          string
  expires_at:          string | null
  // Embedded relations, present only on the joined select below.
  archives?:     { id: string; name: string; owner_name: string | null; owner_email: string | null; preferred_language: string | null } | null
  contributors?: { id: string; name: string | null; email: string | null } | null
}

export type ResolveReplySessionResult =
  | { status: 'ok';      session: ReplySessionRow }
  | { status: 'expired'; session: ReplySessionRow }
  | { status: 'replied'; session: ReplySessionRow }
  | { status: 'unknown' }
  | { status: 'error';   message: string }

export async function resolveReplySession(
  token: string,
  now:   Date = new Date(),
): Promise<ResolveReplySessionResult> {
  const { data, error } = await supabaseAdmin
    .from('email_reply_sessions')
    .select('*, archives(id, name, owner_name, owner_email, preferred_language), contributors(id, name, email)')
    .eq('token', token)
    .maybeSingle()

  // A read failure is not an unknown token. Surface it so a Postgres error
  // cannot masquerade as a bogus token and quietly drop a real reply.
  if (error) return { status: 'error', message: `email_reply_sessions read failed: ${error.message}` }
  if (!data)  return { status: 'unknown' }

  const session = data as ReplySessionRow

  // A null expires_at means a row predating the migration, or an insert that
  // bypassed both the helper and the column default. Treat it as expired rather
  // than as unlimited. Failing closed is the whole point of this change.
  const expiresAt = session.expires_at ? new Date(session.expires_at).getTime() : 0
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    return { status: 'expired', session }
  }

  if (session.replied) return { status: 'replied', session }

  return { status: 'ok', session }
}
