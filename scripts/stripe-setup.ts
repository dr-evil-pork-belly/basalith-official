/**
 * One-time (idempotent) Stripe product + price setup for the billing slice.
 * Run on the TEST key: npx tsx scripts/stripe-setup.ts
 *
 * Idempotency:
 *   - Products are tagged metadata.basalith_key and reused on re-run.
 *   - Prices carry a unique lookup_key (the logical name) and are reused on
 *     re-run. Prices are immutable in Stripe, so a changed amount creates a new
 *     price and the script warns about the stale one (it does not delete).
 *
 * Output: a TEST_PRICES object literal to paste into lib/stripe/prices.ts.
 *
 * Refuses to run on a live key. Amounts are in cents, currency usd (skeleton §3).
 */
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { getStripe, stripeMode } from '../lib/stripe/client'
import type Stripe from 'stripe'

// Verified against Stripe Tax docs via the plugin (2026-06). Basalith is SaaS:
// cloud software delivered entirely over the internet. Stripe recommends
// splitting SaaS by customer type and assigning a code per product, so the
// consumer (B2C) products use Personal Use and the business (Succession)
// products use Business Use. These are category codes, not tax rates — Stripe
// Tax computes the rate from the origin address (set by David) and the buyer
// location.
const TAX_CODE_SAAS_PERSONAL = 'txcd_10103000' // SaaS - Personal Use  (B2C)
const TAX_CODE_SAAS_BUSINESS = 'txcd_10103001' // SaaS - Business Use  (Succession)

type PriceSpec = {
  name: string // logical name -> lookup_key -> key in lib/stripe/prices.ts
  unitAmount: number
  recurring?: { interval: 'month' | 'year' }
}
type ProductSpec = {
  key: string // metadata.basalith_key, stable across runs
  name: string
  taxCode: string
  prices: PriceSpec[]
}

const PRODUCTS: ProductSpec[] = [
  { key: 'b2c_founding', name: 'Basalith B2C Founding', taxCode: TAX_CODE_SAAS_PERSONAL, prices: [
    { name: 'b2c_founding', unitAmount: 250000 },
  ] },
  { key: 'succession_founding', name: 'Basalith Succession Founding', taxCode: TAX_CODE_SAAS_BUSINESS, prices: [
    { name: 'succession_founding', unitAmount: 500000 },
  ] },
  { key: 'b2c_active', name: 'Basalith B2C Active', taxCode: TAX_CODE_SAAS_PERSONAL, prices: [
    { name: 'b2c_active_year',  unitAmount: 360000, recurring: { interval: 'year'  } },
    { name: 'b2c_active_month', unitAmount: 36000,  recurring: { interval: 'month' } },
  ] },
  { key: 'b2c_resting', name: 'Basalith B2C Resting', taxCode: TAX_CODE_SAAS_PERSONAL, prices: [
    { name: 'b2c_resting_year',  unitAmount: 60000, recurring: { interval: 'year'  } },
    { name: 'b2c_resting_month', unitAmount: 6000,  recurring: { interval: 'month' } },
  ] },
  { key: 'b2c_legacy', name: 'Basalith B2C Legacy', taxCode: TAX_CODE_SAAS_PERSONAL, prices: [
    { name: 'b2c_legacy_year', unitAmount: 120000, recurring: { interval: 'year' } },
  ] },
  { key: 'succession', name: 'Basalith Succession', taxCode: TAX_CODE_SAAS_BUSINESS, prices: [
    { name: 'succession_year', unitAmount: 1200000, recurring: { interval: 'year' } },
  ] },
  { key: 'succession_post', name: 'Basalith Succession Post-Transition', taxCode: TAX_CODE_SAAS_BUSINESS, prices: [
    { name: 'succession_post_year', unitAmount: 360000, recurring: { interval: 'year' } },
  ] },
]

async function findProduct(stripe: Stripe, key: string): Promise<Stripe.Product | null> {
  try {
    const res = await stripe.products.search({ query: `metadata['basalith_key']:'${key}'`, limit: 1 })
    if (res.data[0]) return res.data[0]
  } catch {
    // search index can lag right after creation; fall back to a list scan
    const list = await stripe.products.list({ limit: 100, active: true })
    const hit = list.data.find((p) => p.metadata?.basalith_key === key)
    if (hit) return hit
  }
  return null
}

async function upsertProduct(stripe: Stripe, spec: ProductSpec): Promise<string> {
  const existing = await findProduct(stripe, spec.key)
  if (existing) {
    await stripe.products.update(existing.id, { name: spec.name, tax_code: spec.taxCode })
    console.log(`  product reuse  ${spec.key.padEnd(20)} ${existing.id}`)
    return existing.id
  }
  const created = await stripe.products.create({
    name: spec.name,
    tax_code: spec.taxCode,
    metadata: { basalith_key: spec.key },
  })
  console.log(`  product create ${spec.key.padEnd(20)} ${created.id}`)
  return created.id
}

async function upsertPrice(stripe: Stripe, productId: string, spec: PriceSpec): Promise<string> {
  const found = await stripe.prices.list({ lookup_keys: [spec.name], limit: 1 })
  const hit = found.data[0]
  if (hit) {
    const sameAmount = hit.unit_amount === spec.unitAmount
    const sameInterval = (hit.recurring?.interval ?? null) === (spec.recurring?.interval ?? null)
    if (!sameAmount || !sameInterval) {
      console.warn(`  ! price '${spec.name}' exists (${hit.id}) but amount/interval differ from spec. Reusing existing; create a new price manually if the change is intended.`)
    }
    console.log(`  price reuse    ${spec.name.padEnd(20)} ${hit.id}`)
    return hit.id
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: spec.unitAmount,
    lookup_key: spec.name,
    ...(spec.recurring ? { recurring: spec.recurring } : {}),
    metadata: { basalith_key: spec.name },
  })
  console.log(`  price create   ${spec.name.padEnd(20)} ${created.id}`)
  return created.id
}

async function main() {
  if (stripeMode() !== 'test') {
    throw new Error(`Refusing to run on a '${stripeMode()}' key. Test mode only.`)
  }
  const stripe = getStripe()
  const resolved: Record<string, string> = {}

  for (const spec of PRODUCTS) {
    console.log(`\n${spec.name}`)
    const productId = await upsertProduct(stripe, spec)
    for (const price of spec.prices) {
      resolved[price.name] = await upsertPrice(stripe, productId, price)
    }
  }

  console.log('\n\n// ── Paste into TEST_PRICES in lib/stripe/prices.ts ──')
  console.log('const TEST_PRICES: Record<PriceName, string> = {')
  for (const [name, id] of Object.entries(resolved)) {
    console.log(`  ${(name + ':').padEnd(21)}'${id}',`)
  }
  console.log('}')
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e)
  process.exit(1)
})
