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
import { computeCoverage, coverageMonthlySweep } from '@/lib/inngest/coverageFunctions'

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
    computeCoverage,
    coverageMonthlySweep,
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
//
// computeCoverage is one sequential probe per step at two model calls each, so
// it is slow but flat in memory: one draft and one verdict are in hand at a
// time, and each step writes its own row before returning. It is nowhere near
// the export ceiling.
//
// CORRECTION to an earlier note here: the 300 second maxDuration is not a
// ceiling on the whole run. Each probe is its own Inngest step, and a step
// result is checkpointed, so the deadline applies to the work between
// checkpoints rather than to the roughly six minutes a full v2 run takes end to
// end. A probe takes about eight seconds. What the per-probe step boundary buys
// is that a hit deadline resumes at the next probe instead of restarting the
// set, and that a probe exhausting its retries is recorded as a miss with the
// run flagged incomplete.
export const maxDuration = 300
