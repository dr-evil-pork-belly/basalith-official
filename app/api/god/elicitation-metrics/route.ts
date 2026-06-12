import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

// Monday-anchored week start, matching date_trunc('week', ...) in Postgres.
function weekStart(iso: string): string {
  const d   = new Date(iso)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  if (!validateGodAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  const seventyTwoHoursMs = 72 * 60 * 60 * 1000

  const [archivesRes, depositsRes, historyRes, domainsRes, elicitationRes, b2bRes] = await Promise.all([
    supabaseAdmin.from('archives').select('id, name, tier, status').eq('status', 'active'),
    supabaseAdmin.from('owner_deposits').select('archive_id, created_at').is('contributor_id', null).gte('created_at', fourWeeksAgo),
    supabaseAdmin.from('question_history').select('question_id, b2b_question_id, domain_id, framing_used, served_at, answered_at'),
    supabaseAdmin.from('cognitive_domains').select('id, slug'),
    supabaseAdmin.from('elicitation_questions').select('id, tier, text'),
    supabaseAdmin.from('b2b_questions').select('id, question'),
  ])

  const archives    = archivesRes.data    ?? []
  const deposits    = depositsRes.data    ?? []
  const history     = historyRes.data     ?? []
  const domains     = domainsRes.data     ?? []
  const elicitation = elicitationRes.data ?? []
  const b2b         = b2bRes.data         ?? []

  const archiveNameById = new Map(archives.map(a => [a.id, a.name as string]))
  const domainSlugById  = new Map(domains.map(d => [d.id, d.slug as string]))
  const tierByQuestionId = new Map(elicitation.map(q => [q.id, q.tier as string]))
  const textByQuestionId = new Map(elicitation.map(q => [q.id, q.text as string]))
  const textByB2BId      = new Map(b2b.map(q => [q.id, q.question as string]))

  // ── (a) Owner deposits per archive per week, trailing 4 weeks ───────────────
  const depositsByArchiveWeek = new Map<string, Map<string, number>>()
  for (const dep of deposits) {
    const week = weekStart(dep.created_at)
    if (!depositsByArchiveWeek.has(dep.archive_id)) depositsByArchiveWeek.set(dep.archive_id, new Map())
    const wk = depositsByArchiveWeek.get(dep.archive_id)!
    wk.set(week, (wk.get(week) ?? 0) + 1)
  }
  const depositsPerArchivePerWeek = [...depositsByArchiveWeek.entries()].flatMap(([archiveId, weeks]) =>
    [...weeks.entries()].map(([week, count]) => ({
      archiveId,
      archiveName: archiveNameById.get(archiveId) ?? archiveId,
      week,
      deposits: count,
    })),
  ).sort((a, b) => a.archiveName.localeCompare(b.archiveName) || a.week.localeCompare(b.week))

  // ── (b) Answer rate within 72h, grouped by domain / tier / framing_used ──────
  type AnswerKey = string
  const answerGroups = new Map<AnswerKey, { domain: string; tier: string; framingUsed: boolean; served: number; answeredWithin72h: number }>()
  for (const row of history) {
    const domain = row.domain_id !== null ? (domainSlugById.get(row.domain_id) ?? 'unknown') : 'none'
    const tier   = row.question_id !== null ? (tierByQuestionId.get(row.question_id) ?? 'unknown') : 'n/a'
    const framingUsed = !!row.framing_used
    const key = `${domain}|${tier}|${framingUsed}`

    if (!answerGroups.has(key)) answerGroups.set(key, { domain, tier, framingUsed, served: 0, answeredWithin72h: 0 })
    const g = answerGroups.get(key)!
    g.served++

    if (row.answered_at) {
      const servedMs   = new Date(row.served_at).getTime()
      const answeredMs = new Date(row.answered_at).getTime()
      if (answeredMs - servedMs <= seventyTwoHoursMs) g.answeredWithin72h++
    }
  }
  const answerRateByDomainTierFraming = [...answerGroups.values()]
    .map(g => ({ ...g, answerRatePct: g.served > 0 ? Math.round((g.answeredWithin72h / g.served) * 1000) / 10 : 0 }))
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.tier.localeCompare(b.tier) || Number(a.framingUsed) - Number(b.framingUsed))

  // ── (c) Coverage per archive: density, avg depth, last_touched per domain ──
  const coverageResults = await Promise.all(archives.map(async a => {
    const scope = a.tier === 'succession' ? 'b2b' : 'b2c'
    const { data, error } = await supabaseAdmin.rpc('get_domain_coverage', { p_archive_id: a.id, p_scope: scope })
    if (error) return []
    return (data ?? []).map((row: any) => ({
      archiveId:   a.id,
      archiveName: a.name as string,
      slug:        row.slug,
      density:     Number(row.density),
      avgDepth:    Number(row.avg_depth),
      lastTouched: row.last_touched,
    }))
  }))
  const coveragePerArchive = coverageResults.flat()

  // ── (d) Question leaderboard: answer rate for questions with >= 5 serves ───
  type LeaderboardKey = string
  const leaderboardGroups = new Map<LeaderboardKey, { questionId: number | null; b2bQuestionId: string | null; served: number; answered: number }>()
  for (const row of history) {
    const key = row.question_id !== null ? `q:${row.question_id}` : row.b2b_question_id !== null ? `b:${row.b2b_question_id}` : null
    if (!key) continue

    if (!leaderboardGroups.has(key)) {
      leaderboardGroups.set(key, { questionId: row.question_id, b2bQuestionId: row.b2b_question_id, served: 0, answered: 0 })
    }
    const g = leaderboardGroups.get(key)!
    g.served++
    if (row.answered_at) g.answered++
  }
  const questionLeaderboard = [...leaderboardGroups.values()]
    .filter(g => g.served >= 5)
    .map(g => ({
      questionId:    g.questionId,
      b2bQuestionId: g.b2bQuestionId,
      questionText:  g.questionId !== null
        ? (textByQuestionId.get(g.questionId) ?? 'unknown')
        : (textByB2BId.get(g.b2bQuestionId!) ?? 'unknown'),
      served:        g.served,
      answered:      g.answered,
      answerRatePct: Math.round((g.answered / g.served) * 1000) / 10,
    }))
    .sort((a, b) => a.answerRatePct - b.answerRatePct)

  return NextResponse.json({
    depositsPerArchivePerWeek,
    answerRateByDomainTierFraming,
    coveragePerArchive,
    questionLeaderboard,
  })
}
