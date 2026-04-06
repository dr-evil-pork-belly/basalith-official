import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { filterAgent } from '@/lib/agents/filter'
import { qualityAgent } from '@/lib/agents/quality'

export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [filterAgent, qualityAgent],
})

export const dynamic = 'force-dynamic'
