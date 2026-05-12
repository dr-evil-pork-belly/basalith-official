import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 300

const RESIDUAL_MONTHLY_CENTS: Record<string, number> = {
  active:  2000,   // $20 (8% of $3,600/yr = $288/yr = $24/mo; use $20 to be conservative)
  resting: 400,    // $4  (8% of $600/yr = $48/yr = $4/mo)
  legacy:  800,    // $8  (8% of $1,200/yr = $96/yr = $8/mo)
  // Old tier aliases
  archive: 2000,
  estate:  2000,
  dynasty: 2000,
}

function validateCronAuth(req: NextRequest): boolean {
  const auth     = req.headers.get('authorization') ?? ''
  const secret   = process.env.CRON_SECRET ?? ''
  return !!secret && auth === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!validateCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { archivistId: string; amountCents: number; status: string }[] = []

  // 1. Get all certified guides with connected Stripe accounts
  const { data: guides } = await supabaseAdmin
    .from('archivists')
    .select('id, name, email, stripe_account_id, stripe_account_status, certification_status')
    .eq('certification_status', 'certified')
    .not('stripe_account_id', 'is', null)
    .eq('stripe_account_status', 'active')

  if (!guides?.length) {
    return NextResponse.json({ message: 'No eligible guides', processed: 0 })
  }

  for (const guide of guides) {
    try {
      // 2. Get their active archives
      const { data: activeProspects } = await supabaseAdmin
        .from('prospects')
        .select('id, tier, name')
        .eq('archivist_id', guide.id)
        .eq('status', 'Active Client')

      if (!activeProspects?.length) continue

      // 3. Calculate monthly residual
      const totalCents = activeProspects.reduce((sum, p) => {
        const tier = (p.tier ?? '').toLowerCase()
        return sum + (RESIDUAL_MONTHLY_CENTS[tier] ?? RESIDUAL_MONTHLY_CENTS.estate)
      }, 0)

      if (totalCents === 0) continue

      // 4. Check for existing residual payment this month (idempotency)
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { count: existing } = await supabaseAdmin
        .from('commissions')
        .select('id', { count: 'exact', head: true })
        .eq('archivist_id', guide.id)
        .eq('type', 'residual')
        .gte('created_at', monthStart.toISOString())

      if ((existing ?? 0) > 0) {
        results.push({ archivistId: guide.id, amountCents: totalCents, status: 'already_paid' })
        continue
      }

      // 5. Record commission row (Stripe transfer would happen here with real Connect)
      const { error: commError } = await supabaseAdmin
        .from('commissions')
        .insert({
          archivist_id: guide.id,
          type:         'residual',
          amount_cents: totalCents,
          status:       'pending',
          description:  `Monthly residual — ${activeProspects.length} active ${activeProspects.length === 1 ? 'archive' : 'archives'}`,
        })

      if (commError) {
        results.push({ archivistId: guide.id, amountCents: totalCents, status: `error: ${commError.message}` })
        continue
      }

      // 6. Stripe Connect transfer (requires real Stripe setup)
      if (process.env.STRIPE_SECRET_KEY && guide.stripe_account_id) {
        try {
          const Stripe = (await import('stripe')).default
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
          await stripe.transfers.create({
            amount:      totalCents,
            currency:    'usd',
            destination: guide.stripe_account_id,
            description: `Basalith residual — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          })

          // Mark as paid
          await supabaseAdmin
            .from('commissions')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('archivist_id', guide.id)
            .eq('type', 'residual')
            .eq('status', 'pending')

          results.push({ archivistId: guide.id, amountCents: totalCents, status: 'paid' })
        } catch (stripeErr) {
          console.error(`[pay-residuals] Stripe transfer failed for ${guide.id}:`, stripeErr instanceof Error ? stripeErr.message : stripeErr)
          results.push({ archivistId: guide.id, amountCents: totalCents, status: 'commission_recorded_transfer_failed' })
        }
      } else {
        results.push({ archivistId: guide.id, amountCents: totalCents, status: 'commission_recorded' })
      }

    } catch (e) {
      console.error(`[pay-residuals] Guide ${guide.id} failed:`, e instanceof Error ? e.message : e)
      results.push({ archivistId: guide.id, amountCents: 0, status: `exception: ${e instanceof Error ? e.message : 'unknown'}` })
    }
  }

  const totalPaidCents = results.filter(r => r.status === 'paid').reduce((s, r) => s + r.amountCents, 0)

  return NextResponse.json({
    processed: results.length,
    paid:      results.filter(r => r.status === 'paid').length,
    totalPaid: `$${(totalPaidCents / 100).toLocaleString()}`,
    results,
  })
}
