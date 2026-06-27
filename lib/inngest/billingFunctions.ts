import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'
import { getStripe } from '@/lib/stripe/client'
import { createArchiveWithCredentials } from '@/lib/billing/createArchive'
import { buildFoundingWelcomeEmail } from '@/lib/emails/foundingWelcome'
import {
  buildPaymentFailedEmail,
  buildPaymentFailedSubject,
  buildArchivePausedEmail,
} from '@/lib/pauseEmails'

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'legacy@basalith.xyz'

const TIER_LABELS: Record<string, string> = {
  archive: 'The Archive',
  estate:  'The Estate',
  dynasty: 'The Dynasty',
}

async function resolveGuideName(guideId: string | null): Promise<string | null> {
  if (!guideId) return null
  const { data } = await supabaseAdmin
    .from('archivists')
    .select('name')
    .eq('id', guideId)
    .maybeSingle()
  return data?.name ?? null
}

// Resolve an archive from a subscription id across both models: the new model
// links them via the billing table; the legacy model stamped the id directly on
// the archive. Used by the ported payment_failed / canceled handlers.
async function archiveForSubscription(subscriptionId: string) {
  const cols = 'id, name, owner_email, owner_name, preferred_language, status'
  const { data: billing } = await supabaseAdmin
    .from('billing').select('archive_id').eq('stripe_subscription_id', subscriptionId).maybeSingle()
  if (billing?.archive_id) {
    const { data: a } = await supabaseAdmin.from('archives').select(cols).eq('id', billing.archive_id).maybeSingle()
    if (a) return a
  }
  const { data: legacy } = await supabaseAdmin
    .from('archives').select(cols).eq('stripe_subscription_id', subscriptionId).maybeSingle()
  return legacy ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// provisionOnFoundingFee — the only function that does real work this slice.
// IDEMPOTENT: billing.founding_paid_at is the gate, the unique index on
// billing.stripe_subscription_id and the archive_lifecycle primary key are the
// backstops, and Inngest idempotency on the subscription id stops duplicate
// event deliveries from racing.
// ─────────────────────────────────────────────────────────────────────────────
export const provisionOnFoundingFee = inngest.createFunction(
  {
    id:          'provision-on-founding-fee',
    name:        'Provision archive on founding fee',
    retries:     3,
    concurrency: { limit: 5 },
    idempotency: 'event.data.subscriptionId',
    triggers:    [{ event: 'founding_fee.paid' }],
  },
  async ({ event, step }) => {
    const subscriptionId = event.data?.subscriptionId as string | undefined
    if (!subscriptionId) throw new Error('founding_fee.paid missing subscriptionId')

    // 1. Subscription metadata is the authoritative source for application,
    //    segment, tier, and guide. (Threaded at checkout via subscription_data.)
    const meta = await step.run('load-subscription-metadata', async () => {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId)
      return {
        applicationId: (sub.metadata?.application_id as string) ?? null,
        segment:       (sub.metadata?.segment as string) ?? null,
        tier:          (sub.metadata?.tier as string) ?? null,            // billing SKU base
        archiveTier:   (sub.metadata?.archive_tier as string) ?? null,   // archive | estate | dynasty
        familyName:    (sub.metadata?.family_name as string) ?? null,    // supplied at checkout
        guideId:       (sub.metadata?.guide_id as string) ?? null,
        customerId:    typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null),
      }
    })

    // 2. Upsert the billing row keyed by subscription id. This also covers the
    //    case where checkout.session.completed has not landed yet (event order
    //    is not guaranteed). The unique index makes a racing insert a no-op.
    const billing = await step.run('upsert-billing', async () => {
      const { data: existing } = await supabaseAdmin
        .from('billing').select('*').eq('stripe_subscription_id', subscriptionId).maybeSingle()
      if (existing) return existing

      const { data, error } = await supabaseAdmin
        .from('billing')
        .insert({
          application_id:         meta.applicationId,
          stripe_customer_id:     meta.customerId,
          stripe_subscription_id: subscriptionId,
          segment:                meta.segment,
          tier:                   meta.tier,
        })
        .select()
        .single()

      if (error) {
        // Lost a race — re-read the row the other writer created.
        const { data: again } = await supabaseAdmin
          .from('billing').select('*').eq('stripe_subscription_id', subscriptionId).maybeSingle()
        if (again) return again
        throw new Error('billing upsert failed: ' + error.message)
      }
      return data
    })

    // 3. Idempotency gate. A second delivery finds founding_paid_at set and stops.
    if (billing.founding_paid_at) {
      return { ok: true, alreadyProvisioned: true, archiveId: billing.archive_id }
    }

    // 4. Application backs the owner/family/tier values.
    const application = await step.run('load-application', async () => {
      if (!billing.application_id) return null
      const { data } = await supabaseAdmin
        .from('archive_applications').select('*').eq('id', billing.application_id).maybeSingle()
      return data
    })

    const segment     = (billing.segment ?? meta.segment ?? 'b2c') as string
    const archiveTier = (meta.archiveTier ?? 'estate') as string // archives.tier vocabulary
    const ownerEmail  = (application?.email as string) ?? null
    const ownerName   = (application?.name as string) ?? null
    const familyName  = (meta.familyName ?? '').trim() // supplied by the human at checkout

    if (!familyName) {
      throw new Error(`Cannot provision: no family_name in subscription metadata for ${subscriptionId}`)
    }
    if (!ownerEmail) {
      throw new Error(`Cannot provision: no owner email on application ${billing.application_id}`)
    }

    // 5. Create the archive (shared helper). If a partial prior run already
    //    linked an archive, reuse it instead of creating a second one.
    const created = await step.run('create-archive', async () => {
      if (billing.archive_id) return { archiveId: billing.archive_id as string, password: '', magicLinkUrl: null as string | null, reused: true }
      const c = await createArchiveWithCredentials({
        familyName,
        ownerEmail,
        ownerName,
        tier: archiveTier,
        credentialsCreatedBy: meta.guideId ?? null,
      })
      return { archiveId: c.archiveId, password: c.password, magicLinkUrl: c.magicLinkUrl, reused: false }
    })
    const archiveId = created.archiveId

    // 6. Link billing + set the idempotency gate.
    await step.run('link-billing', async () => {
      await supabaseAdmin
        .from('billing')
        .update({
          archive_id:       archiveId,
          founding_paid_at: new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)
    })

    // 7. Archive lifecycle -> active (primary key on archive_id is the backstop).
    await step.run('upsert-lifecycle', async () => {
      await supabaseAdmin
        .from('archive_lifecycle')
        .upsert(
          {
            archive_id:          archiveId,
            segment,
            commercial_state:    'active',
            commercial_state_at: new Date().toISOString(),
            updated_at:          new Date().toISOString(),
          },
          { onConflict: 'archive_id' },
        )
    })

    // 8. Founding commission (B2C + guide present). Guarded by description match
    //    and the founding_paid_at gate. A miss is surfaced, not fatal.
    let commissionWarning: string | null = null
    if (segment === 'b2c' && meta.guideId) {
      commissionWarning = await step.run('founding-commission', async () => {
        const description = `${familyName} Archive, ${archiveTier} tier founding`
        const { data: existing } = await supabaseAdmin
          .from('commissions').select('id')
          .eq('archivist_id', meta.guideId).eq('type', 'founding').eq('description', description)
          .maybeSingle()
        if (existing) return null

        const { error } = await supabaseAdmin
          .from('commissions')
          .insert({
            archivist_id: meta.guideId,
            type:         'founding',
            amount_cents: 100000, // $1,000
            status:       'pending',
            description,
          })
        if (error) {
          console.error('[provision] founding commission write failed:', error.message)
          return error.message
        }
        await supabaseAdmin.rpc('increment_closings', { archivist_id: meta.guideId }).maybeSingle().then(() => {})
        return null
      })
    }

    // 9. Framed welcome email (copy-rule checked).
    await step.run('welcome-email', async () => {
      const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.ai'
      const tierLabel = TIER_LABELS[archiveTier] ?? 'The Estate'
      const guideName = await resolveGuideName(meta.guideId)
      const email = buildFoundingWelcomeEmail({
        familyName,
        firstName:    (ownerName ?? familyName).split(' ')[0],
        guideName,
        tierLabel,
        magicLinkUrl: created.magicLinkUrl,
        password:     created.password,
        loginUrl:     `${siteUrl}/archive-login`,
      })
      try {
        await resend.emails.send({
          from:    `The ${familyName} Archive <${RESEND_FROM}>`,
          to:      ownerEmail,
          subject: email.subject,
          html:    email.html,
          text:    email.text,
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
            'X-Entity-Ref-ID':  `basalith-founding-welcome-${archiveId}`,
            'Precedence':       'bulk',
          },
        })
      } catch (e) {
        // A welcome email failure must not fail provisioning. Log and move on.
        console.error('[provision] welcome email failed:', e instanceof Error ? e.message : e)
      }
    })

    // 9b. If the commission write missed, escalate to admin (do not fail provision).
    if (commissionWarning) {
      await step.run('commission-warning-admin', async () => {
        await resend.emails.send({
          from:    `Basalith <${RESEND_FROM}>`,
          to:      ADMIN_EMAIL,
          subject: `Founding commission write failed — The ${familyName} Archive`,
          headers: { 'X-Entity-Ref-ID': `basalith-comm-fail-${archiveId}` },
          html:    `<p>Provisioning completed but the founding commission insert failed.</p>
            <p>Archive: ${archiveId}</p><p>Guide: ${meta.guideId}</p>
            <p>Error: ${commissionWarning}</p>`,
        })
      })
    }

    // 10. Mark the application won.
    await step.run('mark-application-won', async () => {
      if (!billing.application_id) return
      await supabaseAdmin
        .from('archive_applications')
        .update({ status: 'won' })
        .eq('id', billing.application_id)
    })

    return { ok: true, archiveId, segment, tier: archiveTier, commissionWarning }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// recordRenewal — minimal. Extend/log on a recurring renewal invoice.
// ─────────────────────────────────────────────────────────────────────────────
export const recordRenewal = inngest.createFunction(
  { id: 'record-renewal', name: 'Record subscription renewal', triggers: [{ event: 'subscription.renewed' }] },
  async ({ event }) => {
    const subscriptionId = event.data?.subscriptionId as string | undefined
    console.log('[subscription.renewed]', { subscriptionId, invoiceId: event.data?.invoiceId })
    if (subscriptionId) {
      await supabaseAdmin
        .from('billing')
        .update({ updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
    }
    return { ok: true }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// logPaymentFailed — PORTED live behavior: email the owner a friendly payment
// notice. No dunning, no pause. (Matches the pre-slice webhook.)
// ─────────────────────────────────────────────────────────────────────────────
export const logPaymentFailed = inngest.createFunction(
  { id: 'log-payment-failed', name: 'Payment failed (notice only)', triggers: [{ event: 'payment.failed' }] },
  async ({ event }) => {
    const subscriptionId   = event.data?.subscriptionId as string | undefined
    const hostedInvoiceUrl = (event.data?.hostedInvoiceUrl as string) ?? ''
    if (!subscriptionId) return { ok: true, skipped: 'no subscriptionId' }

    const archive = await archiveForSubscription(subscriptionId)

    console.log('[payment.failed]', { subscriptionId, archiveId: archive?.id, status: archive?.status })

    if (archive && archive.status === 'active') {
      const firstName = archive.owner_name?.split(' ')[0] ?? 'there'
      const lang      = archive.preferred_language ?? 'en'
      try {
        await resend.emails.send({
          from:    `${archive.name} <${RESEND_FROM}>`,
          to:      archive.owner_email,
          subject: buildPaymentFailedSubject(archive.name, lang),
          html:    buildPaymentFailedEmail(firstName, archive.name, hostedInvoiceUrl, lang),
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
            'X-Entity-Ref-ID':  `basalith-payment-failed-${archive.id}-${Date.now()}`,
            'Precedence':       'bulk',
          },
        })
      } catch (e) {
        console.error('[payment.failed] email error:', e)
      }
    }
    return { ok: true }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// logPaymentRecovered — log only.
// ─────────────────────────────────────────────────────────────────────────────
export const logPaymentRecovered = inngest.createFunction(
  { id: 'log-payment-recovered', name: 'Payment recovered (log only)', triggers: [{ event: 'payment.recovered' }] },
  async ({ event }) => {
    console.log('[payment.recovered]', {
      subscriptionId: event.data?.subscriptionId,
      invoiceId:      event.data?.invoiceId,
    })
    return { ok: true }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// logSubscriptionCanceled — PORTED live behavior: pause the archive and email
// the owner that it is preserved. (Matches the pre-slice webhook's
// customer.subscription.deleted handler.)
// ─────────────────────────────────────────────────────────────────────────────
export const logSubscriptionCanceled = inngest.createFunction(
  { id: 'log-subscription-canceled', name: 'Subscription canceled (pause + notice)', triggers: [{ event: 'subscription.canceled' }] },
  async ({ event }) => {
    const subscriptionId = event.data?.subscriptionId as string | undefined
    if (!subscriptionId) return { ok: true, skipped: 'no subscriptionId' }

    const archive = await archiveForSubscription(subscriptionId)

    console.log('[subscription.canceled]', { subscriptionId, archiveId: archive?.id, status: archive?.status })

    if (archive && archive.status === 'active') {
      await supabaseAdmin
        .from('archives')
        .update({ status: 'paused', paused_at: new Date().toISOString(), pause_reason: 'payment_failed' })
        .eq('id', archive.id)

      const firstName = archive.owner_name?.split(' ')[0] ?? 'there'
      const lang      = archive.preferred_language ?? 'en'
      try {
        await resend.emails.send({
          from:    `${archive.name} <${RESEND_FROM}>`,
          to:      archive.owner_email,
          subject: `Your archive is preserved · ${archive.name}`,
          html:    buildArchivePausedEmail(firstName, archive.name, lang),
          headers: {
            'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
            'X-Entity-Ref-ID':  `basalith-paused-${archive.id}-${Date.now()}`,
            'Precedence':       'bulk',
          },
        })
      } catch (e) {
        console.error('[subscription.canceled] paused email error:', e)
      }
    }
    return { ok: true }
  },
)
