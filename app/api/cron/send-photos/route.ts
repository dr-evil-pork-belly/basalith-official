import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam = searchParams.get('secret') || ''
  const authHeader = req.headers.get('authorization') || ''
  const headerSecret = authHeader.replace('Bearer ', '')
  const expectedSecret = process.env.CRON_SECRET || ''

  const isAuthorized = expectedSecret && (
    headerSecret === expectedSecret ||
    secretParam === expectedSecret
  )

  if (!isAuthorized) {
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
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

  // Poll for any new inbound replies
  try {
    await fetch(`${siteUrl}/api/archive/poll-replies`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ manual: false }),
    })
  } catch {
    // Non-fatal
  }

  // Send daily digest to archive owners who had activity in last 24 hours
  // (Combined with photo send since Hobby plan allows one cron)
  const since = new Date()
  since.setDate(since.getDate() - 1)

  const { data: activeArchives } = await supabaseAdmin
    .from('archives')
    .select('id')
    .not('owner_email', 'is', null)

  for (const archive of activeArchives ?? []) {
    try {
      // Check if any labels were added in the last 24 hours
      const { count } = await supabaseAdmin
        .from('labels')
        .select('*', { count: 'exact', head: true })
        .eq('archive_id', archive.id)
        .gte('created_at', since.toISOString())

      if ((count ?? 0) > 0) {
        await fetch(`${siteUrl}/api/archive/morning-digest`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ archiveId: archive.id }),
        })
      }
    } catch {
      // Non-fatal per archive
    }
  }

  // Check significant dates — fire life event emails for today's dates
  const today = new Date()
  const todayMonth = today.getMonth() + 1
  const todayDay   = today.getDate()

  const { data: todayDates } = await supabaseAdmin
    .from('significant_dates')
    .select('id, archive_id, label')
    .eq('month', todayMonth)
    .eq('day', todayDay)
    .eq('active', true)

  for (const dateRow of todayDates ?? []) {
    try {
      await fetch(`${siteUrl}/api/archive/life-event`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ archiveId: dateRow.archive_id, dateId: dateRow.id }),
      })
    } catch {
      // Non-fatal per date
    }
  }

  return NextResponse.json({ processed: results.length, results, lifeEventsTriggered: (todayDates ?? []).length })
}
