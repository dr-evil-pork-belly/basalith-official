import { inngest } from '@/lib/inngest'
import { scoreAndUpdatePair } from '@/lib/trainingPipeline'

export const trainingScorer = inngest.createFunction(
  {
    id:          'training-scorer',
    name:        'Training Scorer — Score & Include',
    retries:     2,
    concurrency: { limit: 3 }, // avoid Claude rate limits
    triggers:    [{ event: 'training/pair-created' }],
  },
  async ({ event, step }) => {
    const { trainingPairId } = event.data as { trainingPairId: string }

    if (!trainingPairId) return { skipped: true, reason: 'no trainingPairId' }

    await step.run('score-and-update', async () => {
      await scoreAndUpdatePair(trainingPairId)
    })

    return { scored: true, trainingPairId }
  },
)
