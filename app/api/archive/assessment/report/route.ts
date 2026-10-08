import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { founderCanReadReport, isAssessment, releaseDueAt } from '@/lib/assessment'

export const dynamic = 'force-dynamic'

// The founder's own report. Slice 4a, October 8, 2026. Read only.
//
// Returns the snapshot stored on dependency_reports.report exactly as it was
// built (lib/dependencyReadings.ts). Nothing here recomputes a count or runs a
// model: what the founder reads is the stored report, which is what a buyer
// will be shown if the founder releases it.
//
// Owner only, assessment records only, and only once the report is built. The
// record comes from the session, never the client. Any other record gets a
// 404, the same answer as "no report yet", so the route says nothing about a
// client's Basalith.
export async function GET() {
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, owner_user_id, status, owner_name')
    .eq('id', session.archiveId)
    .maybeSingle()
  if (!archive || archive.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isAssessment(archive)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { data: row, error } = await supabaseAdmin
      .from('dependency_reports')
      .select('status, report, report_built_at, buyer_name, buyer_org, founder_name')
      .eq('archive_id', archive.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row || !row.report || !row.report_built_at || !founderCanReadReport(row.status)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      status:       row.status,
      report:       row.report,
      builtAt:      row.report_built_at,
      // Computed, not stored: fourteen days from the build (lib/assessment.ts).
      releaseDueAt: releaseDueAt(row.report_built_at as string),
      founderName:  row.founder_name,
      buyerName:    row.buyer_name,
      buyerOrg:     row.buyer_org,
    })
  } catch (err) {
    console.error('[archive/assessment/report]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not load your report' }, { status: 500 })
  }
}
