import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import JSZip from 'jszip'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // seconds — export can take time for large archives

export async function GET(req: NextRequest) {
  // Auth: cookie (portal) OR x-archive-id header (mobile)
  const cookieStore   = await cookies()
  const cookieId      = cookieStore.get('archive-id')?.value
  const headerId      = req.headers.get('x-archive-id')
  const archiveId     = cookieId || headerId

  if (!archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all data in parallel
  const [
    archiveRes,
    depositsRes,
    trainingRes,
    voiceRes,
    photosRes,
    contribsRes,
    datesRes,
    conversationsRes,
  ] = await Promise.allSettled([
    supabaseAdmin.from('archives').select('name, owner_name, created_at, tier, preferred_language, family_name').eq('id', archiveId).single(),
    supabaseAdmin.from('owner_deposits').select('prompt, response, created_at, source_type, essence_status').eq('archive_id', archiveId).order('created_at'),
    supabaseAdmin.from('training_pairs').select('prompt, completion, quality_score, dimension, included_in_training, source_type').eq('archive_id', archiveId).order('created_at'),
    supabaseAdmin.from('voice_recordings').select('id, prompt, transcript, duration_seconds, created_at, transcript_status').eq('archive_id', archiveId).order('created_at'),
    supabaseAdmin.from('photographs').select('id, original_name, ai_era_estimate, status, created_at, labels(what_was_happening, labelled_by, year_taken, location)').eq('archive_id', archiveId).order('created_at'),
    supabaseAdmin.from('contributors').select('name, relationship, status, created_at').eq('archive_id', archiveId),
    supabaseAdmin.from('significant_dates').select('label, date_type, month, day, year, notes').eq('archive_id', archiveId).eq('active', true).order('year'),
    supabaseAdmin.from('entity_conversations').select('role, content, created_at, session_id').eq('archive_id', archiveId).order('created_at').limit(500),
  ])

  const get = <T>(r: PromiseSettledResult<{ data: T | null }>): T =>
    r.status === 'fulfilled' ? (r.value.data ?? [] as unknown as T) : [] as unknown as T

  const archive       = archiveRes.status === 'fulfilled' ? archiveRes.value.data : null
  const deposits      = get(depositsRes)       as any[]
  const training      = get(trainingRes)       as any[]
  const voiceRecs     = get(voiceRes)          as any[]
  const photos        = get(photosRes)         as any[]
  const contributors  = get(contribsRes)       as any[]
  const dates         = get(datesRes)          as any[]
  const conversations = get(conversationsRes)  as any[]

  const exportDate = new Date().toISOString().substring(0, 10)

  const zip = new JSZip()
  const root = zip.folder('basalith-export')!

  // archive-info.json
  root.file('archive-info.json', JSON.stringify({
    name:       archive?.name         ?? '',
    owner:      archive?.owner_name   ?? '',
    family:     archive?.family_name  ?? '',
    created:    archive?.created_at   ?? '',
    tier:       archive?.tier         ?? '',
    language:   archive?.preferred_language ?? 'en',
    exportedAt: new Date().toISOString(),
  }, null, 2))

  // deposits/deposits.json
  const depositsFolder = root.folder('deposits')!
  depositsFolder.file('deposits.json', JSON.stringify(deposits, null, 2))

  // training-pairs/training-pairs.json
  const trainingFolder = root.folder('training-pairs')!
  trainingFolder.file('training-pairs.json', JSON.stringify(training, null, 2))

  // voice-recordings/recordings.json + signed URLs
  const voiceFolder = root.folder('voice-recordings')!
  const voiceWithUrls = await Promise.all(
    voiceRecs.map(async (r: any) => {
      if (!r.id) return r
      try {
        const { data } = await supabaseAdmin.storage.from('voice_recordings').createSignedUrl(
          `${archiveId}/${r.id}.m4a`, 86400 // 24 hours
        )
        return { ...r, downloadUrl: data?.signedUrl ?? null }
      } catch { return r }
    })
  )
  voiceFolder.file('recordings.json', JSON.stringify(voiceWithUrls, null, 2))

  // photographs/photos.json + signed URLs
  const photosFolder = root.folder('photographs')!
  const photosWithUrls = await Promise.all(
    photos.map(async (p: any) => {
      if (!p.id) return p
      try {
        const { data: signed } = await supabaseAdmin.storage.from('photographs').createSignedUrl(
          `${archiveId}/${p.id}.jpg`, 86400
        )
        return { ...p, downloadUrl: signed?.signedUrl ?? null }
      } catch { return p }
    })
  )
  photosFolder.file('photos.json', JSON.stringify(photosWithUrls, null, 2))

  // contributors/contributors.json — no emails or tokens
  const contribFolder = root.folder('contributors')!
  contribFolder.file('contributors.json', JSON.stringify(contributors, null, 2))

  // significant-dates/dates.json
  const datesFolder = root.folder('significant-dates')!
  datesFolder.file('dates.json', JSON.stringify(dates, null, 2))

  // entity-conversations/conversations.json
  const convoFolder = root.folder('entity-conversations')!
  convoFolder.file('conversations.json', JSON.stringify(conversations, null, 2))

  // README.txt
  root.file('README.txt', `BASALITH ARCHIVE EXPORT
Generated: ${exportDate}
Archive: ${archive?.name ?? archiveId}

Your data belongs to you.

This export contains everything Basalith has stored for your archive in open,
readable formats.

FILES INCLUDED:
  archive-info.json          Archive metadata
  deposits/                  All owner deposits (prompts and responses)
  training-pairs/            Entity training data (prompt/completion pairs)
  voice-recordings/          Voice recording metadata and download links
  photographs/               Photograph metadata, captions, and download links
  contributors/              Family contributors (no emails or tokens)
  significant-dates/         Important dates in your archive
  entity-conversations/      Entity chat history (last 500 exchanges)

ABOUT YOUR DATA:
  Training pairs can be used to fine-tune any compatible language model.
  Voice recordings are in M4A format and can be used with any voice synthesis platform.
  Photographs are in JPEG format.
  Download links in JSON files expire after 24 hours.

For questions: hello@basalith.xyz
Security concerns: security@basalith.ai

Heritage Nexus Inc.
`)

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

  return new Response(zipBuffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="basalith-archive-${exportDate}.zip"`,
      'Content-Length':      String(zipBuffer.length),
    },
  })
}
