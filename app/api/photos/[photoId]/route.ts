import { supabaseAdmin } from '@/lib/supabase-admin'

// Image proxy for photographs stored in the private bucket.
// Intentionally unauthenticated — photo IDs are UUIDs (unguessable).
// Anyone who received the email already has legitimate access to this image.
// This is the same approach used by Gmail, Notion, and Linear for media in emails.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Per-IP rate limit store — resets per serverless instance but still
// blocks burst abuse within a single warm instance.
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS   = 60 * 60 * 1000  // 1 hour
const MAX_REQUESTS = 100

export async function GET(
  req: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  // ── Rate limiting ───────────────────────────────────────────────────────────
  const ip  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()

  const current = rateLimit.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS }

  if (now > current.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else if (current.count >= MAX_REQUESTS) {
    return new Response('Too many requests', {
      status:  429,
      headers: { 'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)) },
    })
  } else {
    rateLimit.set(ip, { ...current, count: current.count + 1 })
  }

  // ── UUID validation — reject non-UUIDs before touching the database ─────────
  const { photoId } = await params

  if (!photoId || !UUID_RE.test(photoId)) {
    return new Response('Not found', { status: 404 })
  }

  // ── Fetch and proxy ─────────────────────────────────────────────────────────
  const { data: photo } = await supabaseAdmin
    .from('photographs')
    .select('storage_path')
    .eq('id', photoId)
    .maybeSingle()

  if (!photo?.storage_path) {
    return new Response('Not found', { status: 404 })
  }

  const { data: signed } = await supabaseAdmin
    .storage
    .from('photographs')
    .createSignedUrl(photo.storage_path, 3600) // 1 hour — refreshed on each email open

  if (!signed?.signedUrl) {
    return new Response('Could not generate URL', { status: 500 })
  }

  return new Response(null, {
    status:  302,
    headers: {
      'Location':      signed.signedUrl,
      'Cache-Control': 'private, max-age=3600',
      'X-Photo-Id':    photoId,
    },
  })
}
