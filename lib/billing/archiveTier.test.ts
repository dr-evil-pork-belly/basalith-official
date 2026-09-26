import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { provisionedTier, FAMILY_TIERS } from './archiveTier'

const src = (rel: string) => readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8')

describe('provisionedTier', () => {
  it('provisions a succession purchase as succession, whatever archive_tier says', () => {
    expect(provisionedTier('succession', undefined)).toBe('succession')
    expect(provisionedTier('succession', 'estate')).toBe('succession')
    expect(provisionedTier('succession', 'dynasty')).toBe('succession')
  })

  it('keeps the family tier for a b2c purchase and defaults it to estate', () => {
    for (const t of FAMILY_TIERS) expect(provisionedTier('b2c', t)).toBe(t)
    expect(provisionedTier('b2c', undefined)).toBe('estate')
    expect(provisionedTier(null, null)).toBe('estate')
  })

  it('never passes an unknown value through to archives.tier', () => {
    expect(provisionedTier('b2c', 'succession')).toBe('estate')
    expect(provisionedTier('b2c', 'platinum')).toBe('estate')
  })
})

describe('the paid path uses it at both ends', () => {
  it('checkout writes archive_tier through provisionedTier', () => {
    expect(src('app/api/admin/checkout/route.ts')).toMatch(/archive_tier:\s+provisionedTier\(segment, archiveTier\)/)
  })

  it('provisioning reads the tier through provisionedTier, not a bare estate default', () => {
    const s = src('lib/inngest/billingFunctions.ts')
    expect(s).toMatch(/const archiveTier = provisionedTier\(segment, meta\.archiveTier\)/)
    expect(s).not.toMatch(/meta\.archiveTier \?\? 'estate'/)
  })

  it('no step returns the generated password or a sign-in link (step results are kept in the run history)', () => {
    const s = src('lib/inngest/billingFunctions.ts')
    const body = s.slice(s.indexOf("step.run('create-archive'"), s.indexOf("step.run('link-billing'"))
    expect(body).not.toMatch(/password\s*:/)
    expect(body).not.toMatch(/magicLinkUrl\s*:/)
    expect(s).not.toMatch(/created\.password|created\.magicLinkUrl/)
  })
})
