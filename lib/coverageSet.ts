/**
 * Which probe set a coverage run uses, decided by archive segment.
 *
 * Until September 15, 2026 there was one set (v2, the business probes) and one
 * on-label segment (succession). A run on any other archive was off-label by
 * construction and never shown to a customer. The personal set (p1) makes a
 * personal archive on-label too. This module is the one place that mapping
 * lives, so lib/coverageRun.ts, lib/coverageOwner.ts, and the sweep cannot
 * disagree about which questions and which domains a segment gets.
 *
 * off_label keeps exactly its original meaning: the set does not match the
 * segment. With both segments covered it is false on every real archive. It
 * stays computed rather than hardcoded so a future segment with no set of its
 * own falls back to the business set and is labeled off-label at the row, as
 * before, instead of being shown to someone.
 */

import { B2B_DOMAINS } from './b2bDomains'
import { PERSONAL_DOMAINS } from './personalDomains'
import { COVERAGE_PROBES, PROBE_SET_VERSION, type CoverageProbe } from './coverageProbes'
import { PERSONAL_COVERAGE_PROBES, PERSONAL_PROBE_SET_VERSION } from './coverageProbesPersonal'

/** The archive segments coverage knows. Derived from archives.tier, nowhere else. */
export type CoverageSegment = 'succession' | 'b2c'

/** How the entity is framed for the run. Mirrors FoundingScope in lib/foundingSequence.ts. */
export type CoverageScope = 'business' | 'personal'

export type CoverageDomain = { name: string; description: string; order: number }

export type CoverageSet = {
  version: string
  /** The segment this set is on-label for. */
  segment: CoverageSegment
  scope:   CoverageScope
  probes:  CoverageProbe[]
  domains: CoverageDomain[]
}

export const BUSINESS_SET: CoverageSet = {
  version: PROBE_SET_VERSION,
  segment: 'succession',
  scope:   'business',
  probes:  COVERAGE_PROBES,
  domains: B2B_DOMAINS.map(d => ({ name: d.name, description: d.description, order: d.order })),
}

export const PERSONAL_SET: CoverageSet = {
  version: PERSONAL_PROBE_SET_VERSION,
  segment: 'b2c',
  scope:   'personal',
  probes:  PERSONAL_COVERAGE_PROBES,
  domains: PERSONAL_DOMAINS.map(d => ({ name: d.name, description: d.description, order: d.order })),
}

/** The same derivation lib/coverageRun.ts has always made from archives.tier. */
export function segmentForTier(tier: string | null | undefined): CoverageSegment {
  return tier === 'succession' ? 'succession' : 'b2c'
}

/**
 * The set for a segment. A segment with no set of its own gets the business
 * set, which the caller must then mark off-label (isOffLabel below). That is
 * the pre-p1 behavior for every non-succession archive, kept for any segment
 * that is neither of the two known ones.
 */
export function coverageSetForSegment(segment: string): CoverageSet {
  if (segment === 'b2c') return PERSONAL_SET
  return BUSINESS_SET
}

export function isOffLabel(set: CoverageSet, segment: string): boolean {
  return set.segment !== segment
}

/** Every set that exists, for tests that must cover all of them. */
export const ALL_COVERAGE_SETS: CoverageSet[] = [BUSINESS_SET, PERSONAL_SET]
