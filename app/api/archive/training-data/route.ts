import { cookies } from 'next/headers'
import { getTrainingStats } from '@/lib/trainingPipeline'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value

  if (!archiveId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await getTrainingStats(archiveId)
  return Response.json(stats)
}
