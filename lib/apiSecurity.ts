/**
 * Shared API security utilities.
 * Used across API routes for auth checks, rate limiting, and error sanitization.
 */

import { cookies } from 'next/headers'

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Serverless note: resets per function instance, but still blocks burst attacks
// within a single cold instance. Good enough for MVP — no Upstash dependency.

type RateLimitEntry = { count: number; resetAt: number }
const _store = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  key:            string,
  maxAttempts     = 10,
  windowMs        = 15 * 60 * 1000,
): { allowed: boolean; remaining: number } {
  const now     = Date.now()
  const entry   = _store.get(key)

  if (!entry || now > entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: maxAttempts - entry.count }
}

// ── Cookie auth helpers ───────────────────────────────────────────────────────

export async function getArchiveSession(): Promise<{ archiveId: string } | null> {
  const store     = await cookies()
  const archiveId = store.get('archive-id')?.value
  const auth      = store.get('archive-auth')?.value
  if (!archiveId || !auth) return null
  return { archiveId }
}

export async function getArchivistSession(): Promise<{ archivistId: string } | null> {
  const store       = await cookies()
  const archivistId = store.get('archivist-id')?.value
  const auth        = store.get('archivist-auth')?.value
  if (!archivistId || !auth) return null
  return { archivistId }
}

export function getGodModeAuth(req: { cookies: { get(name: string): { value?: string } | undefined } }): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

// ── IP extraction ─────────────────────────────────────────────────────────────

export function getClientIP(req: { headers: { get(name: string): string | null } }): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}

// ── Safe error responses ──────────────────────────────────────────────────────
// Never expose raw DB errors, stack traces, or internal messages to clients.

export function sanitizedError(err: unknown, context?: string): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (context) console.error(`[${context}]`, msg)
  else         console.error(msg)
  return 'An unexpected error occurred'
}
