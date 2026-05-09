import { NextRequest, NextResponse } from 'next/server'
import { getGodModeAuth } from '@/lib/apiSecurity'

const ALLOWED_ROUTES = [
  '/api/cron/send-photos',
  '/api/cron/weekly-prompt',
  '/api/cron/story-prompt-monday',
  '/api/cron/story-prompt-friday',
  '/api/cron/monthly-report',
  '/api/cron/gratitude-note',
  '/api/cron/memory-game-start',
  '/api/cron/memory-game-reminder',
  '/api/cron/memory-game-summary',
  '/api/cron/memory-game-monthly',
  '/api/cron/daily-reflection',
]

export async function POST(req: NextRequest) {
  // ── God Mode auth required ─────────────────────────────────────────────────
  if (!getGodModeAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { cronRoute?: string; force?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { cronRoute, force } = body

  if (!cronRoute || !ALLOWED_ROUTES.includes(cronRoute)) {
    return NextResponse.json({ error: 'Invalid route' }, { status: 400 })
  }

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const cronSecret = process.env.CRON_SECRET ?? ''

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  try {
    const params = new URLSearchParams({ test: 'true' })
    if (force) params.set('force', 'true')

    // Pass CRON_SECRET via Authorization header, NOT in the URL
    // (URL params appear in server logs; headers do not)
    const response = await fetch(`${siteUrl}${cronRoute}?${params}`, {
      method:  'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    })

    const data = await response.json()

    return NextResponse.json({
      success:    response.ok,
      httpStatus: response.status,
      data,
    })
  } catch {
    // Do NOT return raw error details — they may contain internal paths/config
    return NextResponse.json({ error: 'Cron call failed' }, { status: 500 })
  }
}
