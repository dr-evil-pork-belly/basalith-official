/**
 * Which archives.tier a paid checkout provisions.
 *
 * Until September 25, 2026 the paid path read `archive_tier` from the
 * subscription metadata and defaulted it to 'estate', whatever the segment. A
 * succession purchase therefore became a family Basalith: the personal coverage
 * map, the personal Founding seeds, the family entity. The segment decides the
 * kind of Basalith. `archive_tier` (archive, estate, dynasty) only ever
 * described a family purchase, so it is read for b2c and ignored for
 * succession.
 *
 * Used by app/api/admin/checkout (what it writes into metadata) and by
 * provisionOnFoundingFee (what it provisions), so the two cannot disagree.
 */

export const FAMILY_TIERS = ['archive', 'estate', 'dynasty'] as const
export type FamilyTier = (typeof FAMILY_TIERS)[number]
export type ProvisionedTier = FamilyTier | 'succession'

export function provisionedTier(
  segment: string | null | undefined,
  requestedFamilyTier: string | null | undefined,
): ProvisionedTier {
  if (segment === 'succession') return 'succession'
  return (FAMILY_TIERS as readonly string[]).includes(requestedFamilyTier ?? '')
    ? (requestedFamilyTier as FamilyTier)
    : 'estate'
}
