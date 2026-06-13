/**
 * Stratified eval-holdout assignment logic, shared between
 * scripts/assign-holdout.ts (bulk assignment across all archives) and
 * scripts/run-fidelity-eval.ts (--topup-holdout for a single archive).
 *
 * Implements the holdout design from the eval plan (section 3):
 *   - Pool: classified owner deposits (contributor_id IS NULL AND
 *     source_type != 'contributor', AND at least one deposit_domain_scores row).
 *   - A deposit's domain = its highest-weighted row in deposit_domain_scores,
 *     ties broken by lowest domain_id.
 *   - Archive-level minimum scale rule: fewer than 30 classified owner
 *     deposits -> "insufficient data", no holdout assigned, Tests A/B skipped.
 *   - Target = max(1, round(0.15 * eligible_total)) per archive.
 *   - Domain floor: every domain with >= 3 eligible deposits and zero
 *     existing holdouts gets at least one new holdout. Floors win even if
 *     they push the total above target.
 *   - Sticky: rows already eval_holdout = true are never reassigned, count
 *     toward the target, and are excluded from the selection pool.
 *   - A domain's only eligible deposit is never held out.
 */

import { supabaseAdmin } from './supabase-admin'

export const MIN_SCALE = 30
export const HOLDOUT_FRACTION = 0.15
export const DOMAIN_FLOOR_MIN_ELIGIBLE = 3

export interface DepositRow {
  id:             string
  archive_id:     string
  contributor_id: string | null
  source_type:    string | null
  eval_holdout:   boolean
}

interface DomainScoreRow {
  deposit_id: string
  domain_id:  number
  weight:     number
}

interface DomainRow {
  id:   number
  slug: string
}

export async function fetchAllRows<T>(
  table: string,
  columns: string,
  applyFilter?: (query: any) => any,
): Promise<T[]> {
  const pageSize = 1000
  let from = 0
  const rows: T[] = []

  for (;;) {
    let query = supabaseAdmin.from(table).select(columns)
    if (applyFilter) query = applyFilter(query)
    const { data, error } = await query.range(from, from + pageSize - 1)

    if (error) throw new Error(`fetchAllRows(${table}): ${error.message}`)
    if (!data || data.length === 0) break

    rows.push(...(data as unknown as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

/** Hamilton (largest-remainder) apportionment of `total` across weighted buckets, capped per bucket. */
export function apportion(total: number, weights: number[], caps: number[]): number[] {
  const n = weights.length
  const result = new Array(n).fill(0)
  if (total <= 0) return result

  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum <= 0) return result

  const remainders: number[] = []
  let assigned = 0

  for (let i = 0; i < n; i++) {
    const raw = total * (weights[i] / weightSum)
    const base = Math.min(Math.floor(raw), caps[i])
    result[i] = base
    assigned += base
    remainders.push(raw - Math.floor(raw))
  }

  let leftover = total - assigned
  const order = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r)

  let guard = 0
  while (leftover > 0 && guard < n * 2) {
    for (const { i } of order) {
      if (leftover <= 0) break
      if (result[i] < caps[i]) {
        result[i] += 1
        leftover -= 1
      }
    }
    guard += 1
    if (result.every((v, i) => v >= caps[i])) break
  }

  return result
}

export interface DomainDistributionEntry {
  domainId: number
  slug:     string
  eligible: number
  existing: number
  new:      number
  total:    number
}

export interface ArchiveHoldoutPlan {
  archiveId:         string
  classifiedCount:   number
  insufficientData:  boolean
  target:            number
  existingHoldouts:  number
  deficit:           number
  mandatoryFloors:   number
  newHoldoutIds:     string[]
  distribution:      DomainDistributionEntry[]
}

/** Computes the holdout assignment plan for a single archive. Read-only. */
export async function computeArchiveHoldoutPlan(archiveId: string): Promise<ArchiveHoldoutPlan> {
  const deposits = await fetchAllRows<DepositRow>(
    'owner_deposits',
    'id, archive_id, contributor_id, source_type, eval_holdout',
    query => query.eq('archive_id', archiveId),
  )

  const depositIds = deposits.map(d => d.id)

  const scores = depositIds.length > 0
    ? await fetchAllRows<DomainScoreRow>(
        'deposit_domain_scores',
        'deposit_id, domain_id, weight',
        query => query.in('deposit_id', depositIds),
      )
    : []

  const domains = await fetchAllRows<DomainRow>('cognitive_domains', 'id, slug', query => query.eq('scope', 'b2c'))
  const domainSlugById = new Map(domains.map(d => [d.id, d.slug]))

  // A deposit's domain = highest-weight deposit_domain_scores row, ties broken by lowest domain_id.
  const domainByDepositId = new Map<string, number>()
  for (const s of scores) {
    const current = domainByDepositId.get(s.deposit_id)
    if (current === undefined) {
      domainByDepositId.set(s.deposit_id, s.domain_id)
      continue
    }
    const currentRow = scores.find(r => r.deposit_id === s.deposit_id && r.domain_id === current)!
    if (s.weight > currentRow.weight || (s.weight === currentRow.weight && s.domain_id < current)) {
      domainByDepositId.set(s.deposit_id, s.domain_id)
    }
  }

  const isEligible = (d: DepositRow) =>
    !d.contributor_id && d.source_type !== 'contributor' && domainByDepositId.has(d.id)

  const eligible = deposits.filter(isEligible)
  const classifiedCount = eligible.length

  if (classifiedCount < MIN_SCALE) {
    return {
      archiveId,
      classifiedCount,
      insufficientData: true,
      target: 0,
      existingHoldouts: eligible.filter(d => d.eval_holdout).length,
      deficit: 0,
      mandatoryFloors: 0,
      newHoldoutIds: [],
      distribution: [],
    }
  }

  const target = Math.max(1, Math.round(HOLDOUT_FRACTION * classifiedCount))
  const existingTotal = eligible.filter(d => d.eval_holdout).length

  const byDomain = new Map<number, DepositRow[]>()
  for (const d of eligible) {
    const domainId = domainByDepositId.get(d.id)!
    if (!byDomain.has(domainId)) byDomain.set(domainId, [])
    byDomain.get(domainId)!.push(d)
  }
  const domainIds = [...byDomain.keys()].sort((a, b) => a - b)

  if (existingTotal >= target) {
    const distribution: DomainDistributionEntry[] = domainIds.map(domainId => {
      const depositsInDomain = byDomain.get(domainId)!
      const existingInDomain = depositsInDomain.filter(d => d.eval_holdout).length
      return {
        domainId,
        slug: domainSlugById.get(domainId) ?? `domain_${domainId}`,
        eligible: depositsInDomain.length,
        existing: existingInDomain,
        new: 0,
        total: existingInDomain,
      }
    })

    return {
      archiveId,
      classifiedCount,
      insufficientData: false,
      target,
      existingHoldouts: existingTotal,
      deficit: 0,
      mandatoryFloors: 0,
      newHoldoutIds: [],
      distribution,
    }
  }

  const deficit = target - existingTotal

  // Step 1: domain floors. Every domain with >= 3 eligible deposits and zero
  // existing holdouts must get one (floors win even over the ~15% target).
  const floorAssign = new Map<number, number>()
  for (const domainId of domainIds) {
    const depositsInDomain = byDomain.get(domainId)!
    const existingInDomain = depositsInDomain.filter(d => d.eval_holdout).length
    if (depositsInDomain.length >= DOMAIN_FLOOR_MIN_ELIGIBLE && existingInDomain === 0) {
      floorAssign.set(domainId, 1)
    }
  }
  const mandatory = [...floorAssign.values()].reduce((a, b) => a + b, 0)

  // Step 2: proportional remainder across domains, weighted by domain eligible
  // count, capped by remaining non-holdout availability after floor assignment.
  const remaining = Math.max(0, deficit - mandatory)

  const weights: number[] = []
  const caps: number[] = []
  for (const domainId of domainIds) {
    const depositsInDomain = byDomain.get(domainId)!
    const existingInDomain = depositsInDomain.filter(d => d.eval_holdout).length
    const available = depositsInDomain.length - existingInDomain
    const floorUsed = floorAssign.get(domainId) ?? 0
    const cap = depositsInDomain.length === 1 ? 0 : Math.max(0, available - floorUsed)
    weights.push(depositsInDomain.length)
    caps.push(cap)
  }
  const proportional = apportion(remaining, weights, caps)

  const assignmentByDomain = new Map<number, number>()
  domainIds.forEach((domainId, i) => {
    assignmentByDomain.set(domainId, (floorAssign.get(domainId) ?? 0) + proportional[i])
  })

  const newHoldoutIds: string[] = []
  const newByDomain = new Map<number, string[]>()
  for (const domainId of domainIds) {
    const n = assignmentByDomain.get(domainId) ?? 0
    if (n === 0) continue
    const candidates = byDomain.get(domainId)!
      .filter(d => !d.eval_holdout)
      .map(d => d.id)
      .sort()
      .slice(0, n)
    newByDomain.set(domainId, candidates)
    newHoldoutIds.push(...candidates)
  }

  const distribution: DomainDistributionEntry[] = domainIds.map(domainId => {
    const depositsInDomain = byDomain.get(domainId)!
    const existingInDomain = depositsInDomain.filter(d => d.eval_holdout).length
    const newInDomain = newByDomain.get(domainId)?.length ?? 0
    return {
      domainId,
      slug: domainSlugById.get(domainId) ?? `domain_${domainId}`,
      eligible: depositsInDomain.length,
      existing: existingInDomain,
      new: newInDomain,
      total: existingInDomain + newInDomain,
    }
  })

  return {
    archiveId,
    classifiedCount,
    insufficientData: false,
    target,
    existingHoldouts: existingTotal,
    deficit,
    mandatoryFloors: mandatory,
    newHoldoutIds,
    distribution,
  }
}

/** Writes eval_holdout = true for the given deposit ids, in batches. */
export async function commitHoldoutAssignments(depositIds: string[]): Promise<void> {
  if (depositIds.length === 0) return

  const batchSize = 500
  for (let i = 0; i < depositIds.length; i += batchSize) {
    const batch = depositIds.slice(i, i + batchSize)
    const { error } = await supabaseAdmin
      .from('owner_deposits')
      .update({ eval_holdout: true })
      .in('id', batch)

    if (error) throw new Error(`commitHoldoutAssignments: ${error.message}`)
  }
}

export function formatDistribution(plan: ArchiveHoldoutPlan): string[] {
  return plan.distribution.map(entry => {
    const pct = entry.eligible > 0 ? ((entry.total / entry.eligible) * 100).toFixed(1) : '0.0'
    return (
      `    ${entry.slug.padEnd(28)} eligible=${String(entry.eligible).padStart(3)} ` +
      `existing=${String(entry.existing).padStart(2)} new=${String(entry.new).padStart(2)} ` +
      `total=${String(entry.total).padStart(2)} (${pct}%)`
    )
  })
}
