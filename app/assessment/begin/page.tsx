import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import AssessmentBeginClient from './AssessmentBeginClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title:  'Your assessment',
  robots: { index: false, follow: false },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The way in for a founder named on a dependency report. Slice 3b, October 8,
// 2026. Opens from the invitation link, which carries the report id as
// ?order=. The page shows nothing about the report: not the buyer, not the
// founder. The founder types their own email and /api/assessment/start checks
// the pair. A signed in owner goes to the dashboard, which sends an assessment
// record on to /archive/assessment. searchParams is a Promise in Next 16.
export default async function AssessmentBeginPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams
  const valid = typeof order === 'string' && UUID.test(order) ? order.toLowerCase() : null

  // A signed in owner with no order goes to the dashboard, as before. With an
  // order he sees the form: since October 23, 2026 an owner can order a report
  // on himself (app/api/assessment/start), and redirecting him here would hide
  // the only way in. The route decides everything; this page shows nothing
  // about the row either way.
  const session = await getSessionUser()
  if (session?.archiveId && !valid) redirect('/archive/dashboard')

  return <AssessmentBeginClient order={valid} />
}
