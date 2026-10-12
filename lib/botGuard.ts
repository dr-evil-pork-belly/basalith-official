/**
 * Bot guard for the public trial form. October 10, 2026.
 *
 * Why: on October 9 a script filled /begin with random letters in both text
 * fields and a real person's address. The route created an auth user, a trial
 * archive and a lead row for a mailbox that never asked for one.
 *
 * Four checks, in the order the route runs them (the random letters test,
 * 1c, was added October 12 and is described at its function). Pure functions and one
 * fetch with the client injected, so all of it is tested without a network.
 *
 *   1. Honeypot. A text input no person can see or reach. A script that fills
 *      every input fills it. The route answers ok and writes nothing.
 *   2. Cloudflare Turnstile. The page sends a token, the route asks Cloudflare
 *      whether it is good. ON ONLY WHEN TURNSTILE_SECRET_KEY IS SET. With the
 *      key unset this check is skipped, so the deploy is safe before the keys
 *      exist and is NOT protected by Turnstile until they do.
 *   3. Hourly ceiling. A count of trials started in the last hour, read from
 *      the archives table, so it holds across serverless instances where the
 *      in-memory limiter in lib/apiSecurity.ts does not.
 */

/**
 * Random letters. Added October 12, 2026, after five signups in four days
 * all carried the same mark: "Your name" was one unbroken run of 16 to 21
 * letters that changes from lower case to upper case three or more times
 * ("VhLtaEHGfeGBSFhd"), and "What brought you here" was another.
 *
 * True for: one token, letters A to Z only, 12 or more of them, with three
 * or more lower to upper changes inside it. A real name does not do that.
 * "McDonald" has one change. "MacDonald Smith" is two tokens.
 *
 * This is a rule about one script, not about bots. The script's author can
 * defeat it in a minute. It is here because it stops today's flood with no
 * keys to set. Turnstile is the lasting check.
 */
export function looksLikeRandomLetters(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const s = raw.trim()
  if (s.length < 12 || !/^[A-Za-z]+$/.test(s)) return false
  let changes = 0
  for (let i = 1; i < s.length; i++) {
    const prev = s[i - 1]
    const cur = s[i]
    if (prev === prev.toLowerCase() && cur === cur.toUpperCase()) changes++
  }
  return changes >= 3
}

/**
 * The route's test: the name is random letters, and the optional line is
 * either empty or random letters too. A person who typed a real sentence in
 * the optional line is never refused by this.
 */
export function randomLetterSignup(name: unknown, prompt: unknown): boolean {
  if (!looksLikeRandomLetters(name)) return false
  const p = typeof prompt === 'string' ? prompt.trim() : ''
  return p === '' || looksLikeRandomLetters(p)
}

/** The hidden input's name. Not a name a browser autofills. */
export const HONEYPOT_FIELD = 'subject_line'

/** True when the hidden field carries anything at all. */
export function honeypotTripped(body: Record<string, unknown> | null | undefined): boolean {
  if (!body) return false
  const v = body[HONEYPOT_FIELD]
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.trim().length > 0
  return true
}

/**
 * Trials one deployment will start in any rolling hour. Thirty is far above
 * anything seen so far (single digits a day) and far below a flood. Tune with
 * real numbers.
 */
export const MAX_TRIALS_PER_HOUR = 30

export function overHourlyCeiling(startedInLastHour: number, max: number = MAX_TRIALS_PER_HOUR): boolean {
  return startedInLastHour >= max
}

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function turnstileSecret(env: Record<string, string | undefined> = process.env): string | null {
  const s = (env.TURNSTILE_SECRET_KEY ?? '').trim()
  return s ? s : null
}

export type TurnstileResult =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: 'missing-token' | 'rejected' | 'unreachable'; codes: string[] }

type FetchLike = (url: string, init: { method: string; body: URLSearchParams; signal?: AbortSignal }) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

/**
 * Ask Cloudflare whether the token is good.
 *
 * Fails CLOSED. If Cloudflare cannot be reached or answers with an error, the
 * trial does not start and the person is asked to try again. The other choice
 * lets every script through whenever Cloudflare is slow.
 */
export async function verifyTurnstile(
  token: unknown,
  ip: string | null,
  deps: { secret: string | null; fetchImpl?: FetchLike; timeoutMs?: number },
): Promise<TurnstileResult> {
  if (!deps.secret) return { ok: true, skipped: true }
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
    return { ok: false, reason: 'missing-token', codes: [] }
  }

  const form = new URLSearchParams()
  form.set('secret', deps.secret)
  form.set('response', token)
  if (ip && ip !== 'unknown') form.set('remoteip', ip)

  const doFetch = deps.fetchImpl ?? (fetch as unknown as FetchLike)
  try {
    const res = await doFetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body:   form,
      signal: AbortSignal.timeout(deps.timeoutMs ?? 5000),
    })
    if (!res.ok) return { ok: false, reason: 'unreachable', codes: [`http-${res.status}`] }
    const data = (await res.json()) as { success?: unknown; 'error-codes'?: unknown }
    if (data?.success === true) return { ok: true, skipped: false }
    const codes = Array.isArray(data?.['error-codes']) ? (data['error-codes'] as unknown[]).map(String) : []
    return { ok: false, reason: 'rejected', codes }
  } catch (err) {
    return { ok: false, reason: 'unreachable', codes: [err instanceof Error ? err.name : 'error'] }
  }
}
