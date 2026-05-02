import { NextRequest } from 'next/server'
import { exportTrainingData } from '@/lib/trainingPipeline'

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function GET(req: NextRequest) {
  if (!validateGodAuth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const archiveId = new URL(req.url).searchParams.get('archiveId')
  if (!archiveId) return Response.json({ error: 'archiveId required' }, { status: 400 })

  const jsonl = await exportTrainingData(archiveId)

  if (!jsonl) return Response.json({ error: 'No training data ready for this archive' }, { status: 404 })

  return new Response(jsonl, {
    headers: {
      'Content-Type':        'application/jsonl',
      'Content-Disposition': `attachment; filename="training-${archiveId.slice(0, 8)}.jsonl"`,
    },
  })
}
