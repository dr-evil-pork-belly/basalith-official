import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { B2B_DOMAINS, B2B_TOTAL_QUESTIONS } from '@/lib/b2bDomains'

// Per-domain B2B readiness for succession archives. answered counts DISTINCT
// b2b questions that have at least one answered question_history row (so a
// question answered more than once never pushes a bar past its total).
async function computeB2BReadiness(archiveId: string) {
  const [questionsRes, answeredRes] = await Promise.all([
    supabaseAdmin.from('b2b_questions').select('id, domain_id'),
    supabaseAdmin
      .from('question_history')
      .select('b2b_question_id')
      .eq('archive_id', archiveId)
      .not('b2b_question_id', 'is', null)
      .not('answered_deposit_id', 'is', null),
  ])

  const questions = questionsRes.data ?? []
  const totalByDomain = new Map<number, number>()
  const questionToDomain = new Map<string, number>()
  for (const q of questions) {
    if (q.domain_id == null) continue
    totalByDomain.set(q.domain_id, (totalByDomain.get(q.domain_id) ?? 0) + 1)
    questionToDomain.set(q.id, q.domain_id)
  }

  const answeredQuestionIds = new Set<string>()
  for (const r of answeredRes.data ?? []) {
    if (r.b2b_question_id) answeredQuestionIds.add(r.b2b_question_id)
  }
  const answeredByDomain = new Map<number, number>()
  for (const qid of answeredQuestionIds) {
    const dom = questionToDomain.get(qid)
    if (dom == null) continue
    answeredByDomain.set(dom, (answeredByDomain.get(dom) ?? 0) + 1)
  }

  const domains = B2B_DOMAINS.map(d => ({
    domainId: d.domainId,
    answered: answeredByDomain.get(d.domainId) ?? 0,
    total:    totalByDomain.get(d.domainId) ?? 0,
  }))

  const answered = domains.reduce((sum, d) => sum + d.answered, 0)
  const total    = questions.filter(q => q.domain_id != null).length || B2B_TOTAL_QUESTIONS

  return { domains, overall: { answered, total } }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')

  if (!archiveId || archiveId === 'will-be-set-after-db-setup') {
    return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
  }

  const [archive, decades, recentLabels, contributors, photographs, ownerDeposits, entityConvos, significantDates] = await Promise.all([
    supabaseAdmin
      .from('archives')
      .select('*')
      .eq('id', archiveId)
      .single(),

    supabaseAdmin
      .from('decade_coverage')
      .select('decade, photo_count, labelled_count')
      .eq('archive_id', archiveId)
      .order('decade'),

    supabaseAdmin
      .from('labels')
      .select('id, created_at, what_was_happening, story_extracted, year_taken, location, labelled_by, photograph_id, is_primary_label')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabaseAdmin
      .from('contributors')
      .select('id, name, email, role, status, photos_labelled')
      .eq('archive_id', archiveId)
      .eq('status', 'active'),

    supabaseAdmin
      .from('photographs')
      .select('id, status, storage_path, ai_era_estimate')
      .eq('archive_id', archiveId)
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('owner_deposits')
      .select('id, created_at')
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('entity_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),

    supabaseAdmin
      .from('significant_dates')
      .select('id', { count: 'exact', head: true })
      .eq('archive_id', archiveId),
  ])

  if (archive.error) {
    return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
  }

  const photos   = photographs.data ?? []
  const topPhoto = photos.find(p => p.storage_path) ?? null
  console.log('[dashboard] photos:', photos.length, '| topPhoto:', topPhoto?.id ?? 'none')

  // Succession archives get per-domain B2B readiness. Consumer archives skip
  // this entirely, so their dashboard payload and query count are unchanged.
  const b2bReadiness = archive.data?.tier === 'succession'
    ? await computeB2BReadiness(archiveId)
    : null

  return NextResponse.json({
    archive:             archive.data,
    decades:             decades.data       ?? [],
    recentLabels:        recentLabels.data  ?? [],
    contributors:        contributors.data  ?? [],
    photographs:         photos,
    ownerDeposits:       ownerDeposits.data ?? [],
    entityConversations: entityConvos.count ?? 0,
    significantDates:    significantDates.count ?? 0,
    b2bReadiness,
  })
}
