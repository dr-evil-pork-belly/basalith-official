import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

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
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isTest = new URL(req.url).searchParams.get('test') === 'true'

  // Only run on 1st of month (skip in test mode)
  if (!isTest) {
    if (new Date().getDate() !== 1) {
      return Response.json({ skipped: true, reason: 'Not first of month' })
    }
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const { data: archives } = await supabaseAdmin
    .from('archives')
    .select('id, name, family_name, owner_email, owner_name')
    .eq('status', 'active')
    .not('owner_email', 'is', null)

  if (!archives || archives.length === 0) {
    return Response.json({ sent: 0, message: 'No active archives' })
  }

  let sent = 0

  for (const archive of archives) {
    try {
      // Run all stat queries in parallel
      const [
        { count: newPhotos },
        { count: newLabels },
        { count: newContributors },
        { count: totalContributors },
        { count: newDeposits },
        { count: totalPhotos },
        { count: totalLabels },
        { count: decadesCovered },
        { data: contributorActivity },
        { data: topDecade },
        { data: accuracyRows },
      ] = await Promise.all([
        supabaseAdmin.from('photographs').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id).gte('created_at', cutoff),
        supabaseAdmin.from('labels').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id).gte('created_at', cutoff),
        supabaseAdmin.from('contributors').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id).gte('created_at', cutoff),
        supabaseAdmin.from('contributors').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id).eq('status', 'active'),
        supabaseAdmin.from('owner_deposits').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id).gte('created_at', cutoff),
        supabaseAdmin.from('photographs').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id),
        supabaseAdmin.from('labels').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id),
        supabaseAdmin.from('decade_coverage').select('id', { count: 'exact', head: true }).eq('archive_id', archive.id).gt('photo_count', 0),
        supabaseAdmin.from('labels').select('labelled_by').eq('archive_id', archive.id).gte('created_at', cutoff).not('labelled_by', 'is', null),
        supabaseAdmin.from('decade_coverage').select('decade, photo_count').eq('archive_id', archive.id).order('photo_count', { ascending: false }).limit(1),
        supabaseAdmin.from('entity_accuracy').select('dimension, accuracy_score').eq('archive_id', archive.id).order('accuracy_score', { ascending: true }),
      ])

      // Most active contributor
      const counts: Record<string, number> = {}
      contributorActivity?.forEach(l => {
        if (l.labelled_by) counts[l.labelled_by] = (counts[l.labelled_by] ?? 0) + 1
      })
      const mostActive = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

      // Entity scores
      const overallScore = accuracyRows && accuracyRows.length > 0
        ? Math.round(accuracyRows.reduce((s, a) => s + a.accuracy_score, 0) / accuracyRows.length * 100)
        : 0
      const weakestDimensions = (accuracyRows ?? []).slice(0, 3)

      const ownerFirstName = archive.owner_name?.split(' ')[0] ?? 'there'
      const monthName      = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      await resend.emails.send({
        from:    `${archive.name} <${process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'}>`,
        to:      archive.owner_email,
        subject: `Your archive in ${monthName} — ${archive.name}`,
        html:    buildMonthlyReportEmail({
          archiveName:             archive.name,
          ownerFirstName,
          monthName,
          newPhotos:               newPhotos        ?? 0,
          newLabels:               newLabels         ?? 0,
          newContributors:         newContributors   ?? 0,
          newDeposits:             newDeposits       ?? 0,
          totalPhotos:             totalPhotos       ?? 0,
          totalLabels:             totalLabels       ?? 0,
          totalContributors:       totalContributors ?? 0,
          decadesCovered:          decadesCovered    ?? 0,
          overallScore,
          mostActiveContributor:   mostActive?.[0]   ?? null,
          mostActiveCount:         mostActive?.[1]   ?? 0,
          mostLabeledDecade:       topDecade?.[0]?.decade ?? null,
          weakestDimensions,
        }),
      })

      sent++
      console.log(`[monthly-report] Sent to: ${archive.owner_email}`)
    } catch (err: any) {
      console.error(`[monthly-report] Failed for archive ${archive.id}:`, err.message)
    }
  }

  return Response.json({ sent, total: archives.length, isTest })
}

// ── Email builder ──────────────────────────────────────────────────────────────

function buildMonthlyReportEmail({
  archiveName,
  monthName,
  newPhotos,
  newLabels,
  newContributors,
  newDeposits,
  totalPhotos,
  totalLabels,
  totalContributors,
  decadesCovered,
  overallScore,
  mostActiveContributor,
  mostActiveCount,
  mostLabeledDecade,
  weakestDimensions,
}: {
  archiveName:           string
  ownerFirstName:        string
  monthName:             string
  newPhotos:             number
  newLabels:             number
  newContributors:       number
  newDeposits:           number
  totalPhotos:           number
  totalLabels:           number
  totalContributors:     number
  decadesCovered:        number
  overallScore:          number
  mostActiveContributor: string | null
  mostActiveCount:       number
  mostLabeledDecade:     string | null
  weakestDimensions:     Array<{ dimension: string; accuracy_score: number }>
}): string {
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
  const hasActivity = newPhotos > 0 || newLabels > 0 || newDeposits > 0
  const depthLabel  = getDepthLabel(overallScore)

  const statRows = [
    newPhotos    > 0 ? [newPhotos,    newPhotos    === 1 ? 'photograph uploaded'         : 'photographs uploaded']        : null,
    newLabels    > 0 ? [newLabels,    newLabels    === 1 ? 'family memory contributed'   : 'family memories contributed'] : null,
    newContributors > 0 ? [newContributors, newContributors === 1 ? 'new contributor joined' : 'new contributors joined'] : null,
    newDeposits  > 0 ? [newDeposits,  newDeposits  === 1 ? 'direct deposit to your entity' : 'direct deposits to your entity'] : null,
  ].filter(Boolean) as [number, string][]

  return `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:600px;margin:0 auto;padding:0">

  <div style="padding:32px 32px 24px;border-bottom:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 4px">
      ${archiveName.toUpperCase()}
    </p>
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;margin:0">
      MONTHLY REPORT · ${monthName.toUpperCase()}
    </p>
  </div>

  <div style="padding:32px">

    <p style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EDE6;margin:0 0 8px">
      ${hasActivity ? 'Here is what your archive built this month.' : 'Your archive is waiting for you.'}
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;margin:0 0 32px">
      ${monthName} · ${archiveName}
    </p>

    ${hasActivity ? `
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 16px">
      THIS MONTH
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
      ${statRows.map(([n, label]) => `
      <tr>
        <td style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#F0EDE6;padding:6px 0;width:72px;vertical-align:baseline">${n}</td>
        <td style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#706C65;padding:6px 0;vertical-align:baseline">${label}</td>
      </tr>`).join('')}
    </table>
    ` : `
    <div style="border-left:3px solid rgba(196,162,74,0.3);padding:16px 20px;margin-bottom:32px">
      <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#B8B4AB;margin:0 0 8px">
        Your archive had no new activity this month.
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0">
        The most meaningful archives are built a little at a time. This week's Monday prompt is waiting for you.
      </p>
    </div>
    `}

    ${mostActiveContributor ? `
    <div style="background:rgba(196,162,74,0.04);border:1px solid rgba(196,162,74,0.1);padding:16px 20px;margin-bottom:24px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">
        MOST ACTIVE CONTRIBUTOR
      </p>
      <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 4px">
        ${mostActiveContributor}
      </p>
      <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0">
        ${mostActiveCount} ${mostActiveCount === 1 ? 'memory' : 'memories'} contributed this month
      </p>
    </div>
    ` : ''}

    ${mostLabeledDecade ? `
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 24px">
      Most documented decade this month: <span style="color:#F0EDE6;font-style:normal;font-weight:700">${mostLabeledDecade}</span>
    </p>
    ` : ''}

    <div style="border-top:1px solid rgba(240,237,230,0.06);margin:0 0 24px"></div>

    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;margin:0 0 8px">
      YOUR ENTITY · OVERALL DEPTH
    </p>
    <p style="font-family:Georgia,serif;font-size:48px;font-weight:700;color:#F0EDE6;margin:0 0 4px;line-height:1">
      ${overallScore}%
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#706C65;margin:0 0 24px">
      ${depthLabel}
    </p>

    ${weakestDimensions.length > 0 ? `
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#706C65;margin:0 0 12px">
      WHAT WOULD DEEPEN YOUR ENTITY MOST
    </p>
    ${weakestDimensions.map(d => {
      const label = d.dimension.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      const pct   = Math.round(d.accuracy_score * 100)
      return `<p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#B8B4AB;margin:0 0 8px">→ ${label} (${pct}%)</p>`
    }).join('')}
    <br>
    ` : ''}

    <div style="border-top:1px solid rgba(240,237,230,0.06);padding-top:20px;margin-bottom:24px">
      <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#706C65;margin:0 0 12px">
        YOUR ARCHIVE IN NUMBERS
      </p>
      <p style="font-family:'Courier New',monospace;font-size:11px;color:#3A3830;line-height:2.2;margin:0">
        ${totalPhotos} PHOTOGRAPHS<br>
        ${totalLabels} MEMORIES<br>
        ${totalContributors} CONTRIBUTORS<br>
        ${decadesCovered} DECADES DOCUMENTED
      </p>
    </div>

    <a href="${siteUrl}/archive/dashboard"
      style="display:block;background:#C4A24A;color:#0A0908;font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 24px;text-align:center">
      VIEW YOUR ARCHIVE →
    </a>

  </div>

  <div style="padding:0 32px 32px;border-top:1px solid rgba(240,237,230,0.06)">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#3A3830;line-height:1.8;margin:20px 0 0">
      BASALITH · XYZ<br>
      ${archiveName}<br>
      Heritage Nexus Inc.
    </p>
  </div>

</body>
</html>`
}

function getDepthLabel(score: number): string {
  if (score >= 80) return 'Speaking with authority — one of our richest archives'
  if (score >= 60) return 'Speaking with depth — remarkable accuracy achieved'
  if (score >= 40) return 'Taking shape — your entity is becoming recognizable'
  if (score >= 20) return 'Still learning — real depth is emerging'
  return 'Just beginning — the foundation is being laid'
}
