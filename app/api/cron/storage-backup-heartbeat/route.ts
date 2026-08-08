/**
 * Storage backup heartbeat.
 *
 * A dead job does not report its own death. The realistic failures are the
 * Inngest function stopping, being unregistered by a bad deploy, or the B2
 * credential expiring. This catches all three, because it shares no scheduler,
 * no client, and no credential with the thing it watches. It is a Vercel cron
 * reading a Postgres table, deliberately not a fifth Inngest function.
 *
 * Skeleton 3.1 names the residual gap and this route does not close it: if the
 * Vercel scheduler itself dies silently, this and the sync go quiet together.
 * An external dead man's switch would close it. Not built, named.
 *
 * This route reads. It never writes, never repairs, and never triggers a sync.
 * A watcher that fixes things is a second job that can also fail.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  SILENCE_SYNC_DAYS,
  SILENCE_VERIFY_DAYS,
  checkSilence,
  type Alarm,
} from '@/lib/storageBackup'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'

/** Latest run of one kind that finished successfully. */
async function lastSuccess(kind: 'sync' | 'verify'): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('storage_backup_runs')
    .select('started_at')
    .eq('kind', kind)
    .eq('ok', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`heartbeat read ${kind}: ${error.message}`)
  return (data as { started_at: string } | null)?.started_at ?? null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam = searchParams.get('secret') || ''
  const authHeader = req.headers.get('authorization') || ''
  const headerSecret = authHeader.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET || ''

  const isAuthorized = expected && (headerSecret === expected || secretParam === expected)
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // A seed counts as a sync for silence purposes. It copies objects and proves
  // the whole path works, so treating it as "not a sync" would alarm during the
  // one week the backup is most obviously alive.
  const [syncAt, seedAt, verifyAt] = await Promise.all([
    lastSuccess('sync'),
    (async () => {
      const { data, error } = await supabaseAdmin
        .from('storage_backup_runs')
        .select('started_at')
        .eq('kind', 'seed')
        .eq('ok', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`heartbeat read seed: ${error.message}`)
      return (data as { started_at: string } | null)?.started_at ?? null
    })(),
    lastSuccess('verify'),
  ])

  const newestSync =
    [syncAt, seedAt].filter((v): v is string => v !== null).sort().reverse()[0] ?? null

  const now = new Date()
  const alarms: Alarm[] = checkSilence({
    lastSuccessfulSyncAt: newestSync,
    lastSuccessfulVerifyAt: verifyAt,
    now,
  })

  if (alarms.length) {
    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: ADMIN_EMAIL,
        subject: '[basalith] storage backup is silent',
        html:
          `<pre style="font:13px/1.5 monospace;white-space:pre-wrap">` +
          alarms.map((a) => `${a.code}: ${a.detail}`).join('\n') +
          `\n\nlast successful sync:   ${newestSync ?? 'never'}` +
          `\nlast successful verify: ${verifyAt ?? 'never'}` +
          `</pre>`,
      })
    } catch (e) {
      // The alarm failing to send must not mask the alarm itself, which is
      // still in the response body and the log.
      console.error('[storage-backup-heartbeat] alert failed to send:', e)
    }
  }

  const body = {
    ok: alarms.length === 0,
    checkedAt: now.toISOString(),
    lastSuccessfulSyncAt: newestSync,
    lastSuccessfulVerifyAt: verifyAt,
    thresholds: { syncDays: SILENCE_SYNC_DAYS, verifyDays: SILENCE_VERIFY_DAYS },
    alarms,
  }

  console.log('[storage-backup-heartbeat]', JSON.stringify(body))

  // 200 with ok:false rather than a 5xx. Vercel retries a failed cron, and a
  // retry would re-send the same alarm email. The alarm is the output, not the
  // status code. A5 is carried in the body.
  return NextResponse.json(body)
}
