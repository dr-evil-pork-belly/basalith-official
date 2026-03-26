import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: dueArchives, error } = await supabaseAdmin
    .from('email_preferences')
    .select('archive_id')
    .eq('active', true)
    .lte('next_send_at', now)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://basalith.xyz'
  const results = []

  for (const pref of dueArchives ?? []) {
    try {
      const res = await fetch(`${siteUrl}/api/archive/send-photo`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId: pref.archive_id }),
      })
      const result = await res.json()
      results.push({ archiveId: pref.archive_id, ...result })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ archiveId: pref.archive_id, error: msg })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
