import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  // Validate archivist session — same pattern as proxy.ts
  // archivist-auth and archivist-id are both set to archivistId on login
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('archivist-auth')
  const idCookie   = cookieStore.get('archivist-id')

  if (!authCookie?.value || !idCookie?.value || authCookie.value !== idCookie.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cronRoute } = await req.json()

  // Allowlist — only permit known cron paths
  const ALLOWED = [
    '/api/cron/send-photos',
    '/api/cron/weekly-prompt',
    '/api/cron/story-prompt-monday',
    '/api/cron/story-prompt-friday',
    '/api/cron/monthly-report',
    '/api/cron/gratitude-note',
  ]
  if (!ALLOWED.includes(cronRoute)) {
    return NextResponse.json({ error: 'Unknown cron route' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

  try {
    const res = await fetch(`${siteUrl}${cronRoute}?test=true`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const data = await res.json()
    return NextResponse.json({ ok: res.ok, status: res.status, result: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
