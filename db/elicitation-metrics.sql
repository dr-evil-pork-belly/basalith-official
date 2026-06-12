-- Elicitation engine measurement queries
--
-- These are read-only reporting queries against the tables written by
-- lib/selectNextQuestion.ts (question_history) and the daily-reflection
-- cron (owner_deposits). Run directly in the Supabase SQL editor.

-- =============================================================================
-- (a) Owner deposits per archive per week, trailing 4 weeks
-- =============================================================================
select
  a.id                              as archive_id,
  a.name                            as archive_name,
  date_trunc('week', od.created_at) as week_start,
  count(*)                          as deposits
from owner_deposits od
join archives a on a.id = od.archive_id
where od.contributor_id is null
  and od.created_at >= date_trunc('week', now()) - interval '3 weeks'
group by a.id, a.name, week_start
order by a.name, week_start;


-- =============================================================================
-- (b) Answer rate (answered within 72h / served), grouped by domain, tier,
--     and framing_used
-- =============================================================================
select
  cd.slug                                              as domain,
  eq.tier,
  qh.framing_used,
  count(*)                                             as served,
  count(*) filter (
    where qh.answered_at is not null
      and qh.answered_at <= qh.served_at + interval '72 hours'
  )                                                     as answered_within_72h,
  round(
    100.0 * count(*) filter (
      where qh.answered_at is not null
        and qh.answered_at <= qh.served_at + interval '72 hours'
    ) / count(*),
    1
  )                                                     as answer_rate_pct
from question_history qh
left join cognitive_domains     cd on cd.id = qh.domain_id
left join elicitation_questions eq on eq.id = qh.question_id
group by cd.slug, eq.tier, qh.framing_used
order by cd.slug, eq.tier, qh.framing_used;


-- =============================================================================
-- (c) Coverage per archive: density, avg depth, last_touched per domain
-- =============================================================================
select
  a.id   as archive_id,
  a.name as archive_name,
  cov.slug,
  cov.density,
  cov.avg_depth,
  cov.last_touched
from archives a
cross join lateral get_domain_coverage(
  a.id,
  case when a.tier = 'succession' then 'b2b' else 'b2c' end
) cov
where a.status = 'active'
order by a.name, cov.slug;


-- =============================================================================
-- (d) Question leaderboard: answer rate per question with at least 5 serves
-- =============================================================================
select
  qh.question_id,
  qh.b2b_question_id,
  coalesce(eq.text, bq.question)                                     as question_text,
  count(*)                                                            as served,
  count(*) filter (where qh.answered_at is not null)                 as answered,
  round(
    100.0 * count(*) filter (where qh.answered_at is not null) / count(*),
    1
  )                                                                    as answer_rate_pct
from question_history qh
left join elicitation_questions eq on eq.id = qh.question_id
left join b2b_questions         bq on bq.id = qh.b2b_question_id
group by qh.question_id, qh.b2b_question_id, coalesce(eq.text, bq.question)
having count(*) >= 5
order by answer_rate_pct asc;
