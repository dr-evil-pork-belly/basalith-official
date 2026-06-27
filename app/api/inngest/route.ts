import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { filterAgent }     from '@/lib/agents/filter'
import { qualityAgent }    from '@/lib/agents/quality'
import { trainingScorer }  from '@/lib/agents/trainingScorer'
import {
  provisionOnFoundingFee,
  recordRenewal,
  logPaymentFailed,
  logPaymentRecovered,
  logSubscriptionCanceled,
} from '@/lib/inngest/billingFunctions'

export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [
    filterAgent,
    qualityAgent,
    trainingScorer,
    provisionOnFoundingFee,
    recordRenewal,
    logPaymentFailed,
    logPaymentRecovered,
    logSubscriptionCanceled,
  ],
})

export const dynamic = 'force-dynamic'
