import { stripeMode } from './client'

/**
 * Mode-aware price resolver. A test price id and a live price id differ, so we
 * keep a table per mode instead of scattering ids through the code.
 *
 * TEST_PRICES is populated by scripts/stripe-setup.ts (run on the test key).
 * LIVE_PRICES is populated by David at promotion, after creating the products
 * in live mode. Claude Code never fills LIVE_PRICES.
 */
export type PriceName =
  | 'b2c_founding'
  | 'b2c_active_year'
  | 'b2c_active_month'
  | 'b2c_resting_year'
  | 'b2c_resting_month'
  | 'b2c_legacy_year'
  | 'succession_founding'
  | 'succession_year'
  | 'succession_post_year'

// Filled by scripts/stripe-setup.ts (test mode, account acct_1TmdWF1yVjZPfnWn).
// Empty string = not yet created. Re-run the script to refresh.
const TEST_PRICES: Record<PriceName, string> = {
  b2c_founding:        'price_1TmeZY1yVjZPfnWnItvJVh2N',
  b2c_active_year:     'price_1TmeZZ1yVjZPfnWnn4TvxagL',
  b2c_active_month:    'price_1TmeZa1yVjZPfnWnOitUHt7L',
  b2c_resting_year:    'price_1TmeZb1yVjZPfnWnOEUdJmz0',
  b2c_resting_month:   'price_1TmeZb1yVjZPfnWnzmMm3JG5',
  b2c_legacy_year:     'price_1TmeZc1yVjZPfnWn91GtpcNI',
  succession_founding: 'price_1TmeZY1yVjZPfnWnSKS81dQy',
  succession_year:     'price_1TmeZd1yVjZPfnWnFeIWN27n',
  succession_post_year:'price_1TmeZd1yVjZPfnWnvqCnNKbR',
}

// Populated by David in live mode at promotion. Do not fill from the sandbox.
const LIVE_PRICES: Record<PriceName, string> = {
  b2c_founding:        '',
  b2c_active_year:     '',
  b2c_active_month:    '',
  b2c_resting_year:    '',
  b2c_resting_month:   '',
  b2c_legacy_year:     '',
  succession_founding: '',
  succession_year:     '',
  succession_post_year:'',
}

/**
 * Resolve a logical price name to the Stripe price id for the current mode.
 * Throws loudly if the id is missing, so a misconfigured env fails fast at
 * checkout-build time rather than sending a broken session to a family.
 */
export function priceId(name: PriceName): string {
  const mode = stripeMode()
  const table = mode === 'live' ? LIVE_PRICES : TEST_PRICES
  const id = table[name]
  if (!id) {
    throw new Error(
      `No ${mode} Stripe price id for '${name}'. ` +
      (mode === 'test'
        ? 'Run: npx tsx scripts/stripe-setup.ts'
        : 'Populate LIVE_PRICES in lib/stripe/prices.ts before promotion.'),
    )
  }
  return id
}
