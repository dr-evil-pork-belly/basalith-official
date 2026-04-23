import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, storagePath, fileName, fileSize, fileType, isVideo } = await req.json()

    if (!token || !storagePath) {
      return NextResponse.json({ error: 'token and storagePath required' }, { status: 400 })
    }

    const contributor = await getContributorByToken(token)
    if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const archiveId       = contributor.archive_id as string
    const contributorName = contributor.name ?? contributor.email

    if (isVideo) {
      const ext = fileName ? fileName.split('.').pop()?.toLowerCase() || 'bin' : 'bin'
      const { error: dbError } = await supabaseAdmin.from('archive_videos').insert({
        archive_id:        archiveId,
        storage_path:      storagePath,
        file_name:         fileName         || null,
        file_type:         ext,
        video_type:        'home_video',
        uploaded_by_name:  contributorName  || null,
        file_size:         fileSize         ? parseInt(fileSize) : null,
        processing_status: 'pending',
        transcript_status: 'pending',
      })
      if (dbError) {
        console.error('[register-media] videos insert error:', dbError.message)
        throw new Error(dbError.message)
      }

      // Increment videos_uploaded (best-effort)
      try {
        const { data: cur } = await supabaseAdmin
          .from('contributors').select('videos_uploaded').eq('id', contributor.id).maybeSingle()
        await supabaseAdmin
          .from('contributors')
          .update({ videos_uploaded: (cur?.videos_uploaded ?? 0) + 1 })
          .eq('id', contributor.id)
      } catch {}

    } else {
      const { error: dbError } = await supabaseAdmin.from('archive_documents').insert({
        archive_id:    archiveId,
        storage_path:  storagePath,
        file_name:     fileName        || null,
        file_size:     fileSize        ? parseInt(fileSize) : null,
        uploaded_by:   contributorName || null,
        status:        'pending',
      })
      if (dbError) {
        console.error('[register-media] archive_documents insert error:', dbError.message)
        throw new Error(dbError.message)
      }
    }

    // Notify archive owner (best-effort)
    const archive = contributor.archives as { name: string; family_name: string; owner_email: string | null } | null
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
      ${fileName || ''}
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

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[contribute/register-media]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
