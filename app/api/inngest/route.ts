import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { filterAgent }     from '@/lib/agents/filter'
import { qualityAgent }    from '@/lib/agents/quality'
import { trainingScorer }  from '@/lib/agents/trainingScorer'

export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [filterAgent, qualityAgent, trainingScorer],
})

export const dynamic = 'force-dynamic'
