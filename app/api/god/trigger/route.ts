import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

const CRON_ROUTES: Record<string, string> = {
  'send-photos':          '/api/cron/send-photos',
  'weekly-prompt':        '/api/cron/weekly-prompt',
  'story-prompt-monday':  '/api/cron/story-prompt-monday',
  'story-prompt-friday':  '/api/cron/story-prompt-friday',
  'monthly-report':       '/api/cron/monthly-report',
  'gratitude-note':       '/api/cron/gratitude-note',
  'memory-game':          '/api/cron/memory-game-start',
  'memory-game-reminder': '/api/cron/memory-game-reminder',
  'memory-game-summary':  '/api/cron/memory-game-summary',
}

export async function POST(req: NextRequest) {
  if (!validateGodAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { route, archiveId } = await req.json()

    const cronPath = CRON_ROUTES[route]
    if (!cronPath) {
      return NextResponse.json({ error: `Unknown route: ${route}` }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const url     = new URL(cronPath, baseUrl)
    if (archiveId) url.searchParams.set('archiveId', archiveId)

    const res = await fetch(url.toString(), {
      method:  'GET',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
    })

    const text = await res.text()
    let body: unknown
    try { body = JSON.parse(text) } catch { body = text }

    return NextResponse.json({ success: res.ok, status: res.status, body })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
