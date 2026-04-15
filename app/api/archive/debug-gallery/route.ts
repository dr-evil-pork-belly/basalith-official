import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  const archiveAuth = cookieStore.get('archive-auth')?.value

  if (!archiveId) {
    return Response.json({
      error:   'No archive-id cookie found',
      cookies: { archiveId: null, archiveAuth: null },
    })
  }

  // Check what photos exist for this archive
  const { data: photos, error: photosError } = await supabaseAdmin
    .from('photographs')
    .select('id, status, ai_processed, priority_score, storage_path')
    .eq('archive_id', archiveId)
    .limit(10)

  // Count by status
  const { data: statusCounts, error: countError } = await supabaseAdmin
    .from('photographs')
    .select('status')
    .eq('archive_id', archiveId)

  const counts: Record<string, number> = {}
  statusCounts?.forEach(r => {
    counts[r.status] = (counts[r.status] ?? 0) + 1
  })

  // Check archive record
  const { data: archive } = await supabaseAdmin
    .from('archives')
    .select('id, name, status')
    .eq('id', archiveId)
    .single()

  return Response.json({
    archiveId,
    archiveAuth:   archiveAuth ? '[present]' : '[missing]',
    archiveName:   archive?.name   ?? null,
    archiveStatus: archive?.status ?? null,
    totalPhotos:   statusCounts?.length ?? 0,
    countsByStatus: counts,
    samplePhotos:  photos?.map(p => ({
      id:             p.id,
      status:         p.status,
      ai_processed:   p.ai_processed,
      priority_score: p.priority_score,
      has_path:       !!p.storage_path,
    })) ?? [],
    photosError:  photosError?.message ?? null,
    countError:   countError?.message  ?? null,
  })
}
