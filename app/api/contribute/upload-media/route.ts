import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const maxDuration = 60

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData     = await req.formData()
    const token        = formData.get('token') as string
    const file         = formData.get('file') as File
    const mediaType    = formData.get('mediaType') as string // 'video' | 'document'

    if (!token || !file) {
      return NextResponse.json({ error: 'token and file required' }, { status: 400 })
    }

    const contributor = await getContributorByToken(token)
    if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const archiveId       = contributor.archive_id as string
    const contributorName = contributor.name ?? contributor.email
    const archive         = contributor.archives as { name: string; family_name: string; owner_email: string | null } | null

    const mimeType  = file.type
    const isVideo   = mimeType.startsWith('video/') || mediaType === 'video'
    const ext       = file.name.split('.').pop() || 'bin'
    const bucket    = isVideo ? 'archive-videos' : 'archive-documents'
    const storagePath = `${archiveId}/${Date.now()}.${ext}`
    const buffer    = await file.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    // Insert record into appropriate table
    if (isVideo) {
      try {
        await supabaseAdmin.from('archive_videos').insert({
          archive_id:        archiveId,
          storage_path:      storagePath,
          file_name:         file.name,
          file_type:         ext,
          video_type:        'home_video',
          uploaded_by_name:  contributorName || null,
          file_size:         file.size,
          processing_status: 'pending',
          transcript_status: 'pending',
        })
      } catch {}

      try {
        await supabaseAdmin
          .from('contributors')
          .update({ videos_uploaded: (contributor.videos_uploaded ?? 0) + 1 })
          .eq('id', contributor.id)
      } catch {}
    } else {
      try {
        await supabaseAdmin.from('archive_documents').insert({
          archive_id:    archiveId,
          storage_path:  storagePath,
          file_name:     file.name,
          file_size:     file.size,
          uploaded_by:   contributorName || null,
          status:        'pending',
        })
      } catch {}
    }

    // Notify archive owner
    if (archive?.owner_email) {
      const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'
      const mediaLabel = isVideo ? 'a video' : 'a document'

      resend.emails.send({
        from:    `${archive.name} <${fromEmail}>`,
        to:      archive.owner_email,
        subject: `${contributorName} uploaded ${mediaLabel} to your archive`,
        html: `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:520px;margin:0 auto;padding:0">
  <div style="padding:40px 40px 32px">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0 0 20px">
      ${archive.name.toUpperCase()}
    </p>
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 12px">
      ${contributorName} uploaded ${mediaLabel} to your archive.
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#9DA3A8;margin:0 0 20px">
      ${file.name}
    </p>
    <a href="${siteUrl}/archive/dashboard" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;text-decoration:none">
      VIEW YOUR ARCHIVE →
    </a>
  </div>
</body>
</html>`,
        headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@basalith.xyz>',
          'X-Entity-Ref-ID':  `basalith-${archiveId}-${Date.now()}`,
          'Precedence':       'bulk',
        },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, fileName: file.name, isVideo })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[contribute/upload-media]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
