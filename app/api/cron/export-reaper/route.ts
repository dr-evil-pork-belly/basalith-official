/**
 * Export reaper.
 *
 * Deletes generated export zips once they reach RETENTION_DAYS. An export
 * object is a complete unencrypted copy of a family's whole archive, so the
 * thing that removes it is not optional housekeeping. It is the mechanism that
 * makes the retention promise in the delivery email true.
 *
 * The signed URL in that email expires at exactly the same instant the object
 * becomes reapable. Between that instant and this cron's next run the object
 * still exists but no valid link to it does. That window is bounded by the cron
 * interval, which is why this runs daily and why the export job reaps too.
 *
 * Silence is the failure mode that matters. A reaper that quietly stops running
 * accumulates complete copies of every archive that was ever exported, so this
 * reports what it did on every run, not only on error.
 *
 * `?dryRun=1` reports what would be deleted and deletes nothing. Vercel's
 * scheduler never sends it, so the scheduled run always reaps. It is there so a
 * delete path aimed at complete unencrypted archive copies can be proven against
 * real production objects before it is trusted to remove one.
 */
import { NextRequest, NextResponse } from 'next/server'
import { reapExpiredExports } from '@/lib/archiveExportReaper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secretParam  = searchParams.get('secret') || ''
  const authHeader   = req.headers.get('authorization') || ''
  const headerSecret = authHeader.replace('Bearer ', '')
  const expected     = process.env.CRON_SECRET || ''

  const isAuthorized = expected && (headerSecret === expected || secretParam === expected)
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Opt-in only. Anything other than the literal '1' reaps, so a typo in the
  // query string cannot silently turn the scheduled run into a no-op.
  const dryRun = searchParams.get('dryRun') === '1'

  return NextResponse.json(await reapExpiredExports({ dryRun }))
}
