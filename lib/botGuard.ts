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
 *   2. Vercel BotID (October 12, replacing the Cloudflare Turnstile check
 *      written October 10: Cloudflare is not part of this stack). The page
 *      runs an invisible challenge, the route asks Vercel whether the request
 *      came through it. No keys. Off when TRIAL_BOTID is "off".
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
 * keys to set. BotID is the lasting check.
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

/** The kill switch. TRIAL_BOTID=off in the Vercel environment skips the check. */
export function botIdEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.TRIAL_BOTID ?? '').trim().toLowerCase() !== 'off'
}

export type BrowserCheck =
  | { ok: true; skipped: boolean; errored: boolean }
  | { ok: false }

/**
 * Vercel BotID, with the call injected so this file never imports the
 * package and the tests need no network. The route passes checkBotId from
 * 'botid/server'.
 *
 * isBot true: refused. That includes any request that did not come from a
 * page of this site, such as a script posting straight to the route.
 *
 * Fails OPEN. If the check itself throws (the package misconfigured, Vercel
 * unreachable), the signup goes on to the remaining checks and the error is
 * logged. The reason: a thrown error here is our fault, not a visitor's, and
 * failing closed would refuse every real person until someone noticed. The
 * honeypot, the random letters test and the hourly ceiling still stand.
 */
export async function checkBrowser(deps: {
  enabled: boolean
  check: () => Promise<{ isBot: boolean }>
  onError?: (err: unknown) => void
}): Promise<BrowserCheck> {
  if (!deps.enabled) return { ok: true, skipped: true, errored: false }
  try {
    const verdict = await deps.check()
    if (verdict?.isBot === true) return { ok: false }
    return { ok: true, skipped: false, errored: false }
  } catch (err) {
    deps.onError?.(err)
    return { ok: true, skipped: false, errored: true }
  }
}
