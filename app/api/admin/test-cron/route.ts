import { NextResponse } from 'next/server'

const ALLOWED_ROUTES = [
  '/api/cron/send-photos',
  '/api/cron/weekly-prompt',
  '/api/cron/story-prompt-monday',
  '/api/cron/story-prompt-friday',
  '/api/cron/monthly-report',
  '/api/cron/gratitude-note',
]

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cronRoute } = body

    if (!cronRoute || !ALLOWED_ROUTES.includes(cronRoute)) {
      return NextResponse.json({ error: 'Invalid route' }, { status: 400 })
    }

    const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
    const cronSecret = process.env.CRON_SECRET ?? ''

    console.log('[test-cron] Calling:', cronRoute)
    console.log('[test-cron] CRON_SECRET set:', !!cronSecret)
    console.log('[test-cron] Site URL:', siteUrl)

    const response = await fetch(`${siteUrl}${cronRoute}?test=true&secret=${cronSecret}`, {
      method: 'GET',
    })

    console.log('[test-cron] Response status:', response.status)

    const data = await response.json()
    console.log('[test-cron] Response data:', JSON.stringify(data))

    return NextResponse.json({
      success:    response.ok,
      httpStatus: response.status,
      data,
      cronSecretSet: !!cronSecret,
      siteUrl,
    })
  } catch (error: any) {
    console.error('[test-cron] Error:', error.message)
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
