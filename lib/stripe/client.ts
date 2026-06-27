import Stripe from 'stripe'

/**
 * Shared server-side Stripe client. Lazy singleton — throws at call time if
 * STRIPE_SECRET_KEY is missing, not at module load (safe to import during build
 * without the key). Mirrors the lazy pattern in lib/resend.ts.
 *
 * apiVersion is pinned to match the existing usage in
 * app/api/cron/pay-residuals/route.ts so the whole codebase speaks one version.
 *
 * Server-only. Never import this from a client component.
 */
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

/** 'test' unless the secret key is a live key. Drives the price resolver. */
export function stripeMode(): 'test' | 'live' {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test'
}
