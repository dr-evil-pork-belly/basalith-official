import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ROUTES = [
  '/api/cron/send-photos',
  '/api/cron/weekly-prompt',
  '/api/cron/story-prompt-monday',
  '/api/cron/story-prompt-friday',
  '/api/cron/monthly-report',
  '/api/cron/gratitude-note',
]

export async function POST(req: NextRequest) {
  try {
    const { cronRoute } = await req.json()

    if (!cronRoute || !ALLOWED_ROUTES.includes(cronRoute)) {
      return NextResponse.json({ error: 'Invalid route' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

    const response = await fetch(`${siteUrl}${cronRoute}?test=true`, {
      method:  'GET',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })

    const data = await response.json()
    return NextResponse.json({ success: response.ok, status: response.status, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Unknown error' }, { status: 500 })
  }
}
