import { getSessionUser } from '@/lib/auth/getSessionUser'
import { getTrainingStats } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session   = await getSessionUser()
  const archiveId = session?.archiveId

  if (!archiveId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await getTrainingStats(archiveId)
  return Response.json(stats)
}
