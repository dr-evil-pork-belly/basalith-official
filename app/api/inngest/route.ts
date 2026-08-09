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
import { buildArchiveExportJob } from '@/lib/inngest/exportFunctions'
import { storageBackupSync, storageBackupVerify } from '@/lib/inngest/storageBackupFunctions'

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
    buildArchiveExportJob,
    storageBackupSync,
    storageBackupVerify,
  ],
})

export const dynamic = 'force-dynamic'

// buildArchiveExportJob assembles the whole zip in one step and holds both the
// source objects and the packed output in memory. The largest archive today is
// 362 MB (Hoa Le Tran), so peak is roughly 750 MB. Duration and memory are set
// in vercel.json for this route, which is shared by every Inngest function.
//
// The storage backup functions are not what drives that ceiling. Each copy step
// holds exactly one object, and the largest in scope is 12.05 MB against a
// 50 MB per-bucket cap. They are comfortable inside whatever the export job
// needs, which is why they were given per-object steps rather than one wrapping
// step: a retry re-downloads 12 MB, not 1076 MB against a metered egress line.
export const maxDuration = 300
