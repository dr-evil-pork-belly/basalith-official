import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { inngest } from '@/lib/inngest'
import { resend } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, storagePath, fileName, fileSize } = await req.json()
    if (!token || !storagePath) {
      return NextResponse.json({ error: 'token and storagePath required' }, { status: 400 })
    }

    const contributor = await getContributorByToken(token)
    if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const archiveId      = contributor.archive_id as string
    const contributorName = contributor.name ?? contributor.email

    const { data: photo, error: dbError } = await supabaseAdmin
      .from('photographs')
      .insert({
        archive_id:     archiveId,
        storage_path:   storagePath,
        original_name:  fileName                         || null,
        file_size:      fileSize ? parseInt(fileSize) : null,
        status:         'pending_ai',
        ai_processed:   false,
        priority_score: 0.5,
      })
      .select()
      .single()

    if (dbError || !photo) {
      console.error('[register-photo] DB insert error:', dbError?.message, dbError?.details)
      throw new Error(dbError?.message || 'Failed to create photo record')
    }

    // Track contributor attribution in labels table
    try {
      await supabaseAdmin.from('labels').insert({
        archive_id:       archiveId,
        photograph_id:    photo.id,
        labelled_by:      contributorName,
        is_primary_label: false,
        essence_status:   'pending',
      })
    } catch {}

    // Fire Inngest event
    try {
      await inngest.send({
        name: 'photo/uploaded',
        data: {
          photographId: photo.id,
          archiveId,
          storagePath,
          uploadedBy:   contributorName,
        },
      })
    } catch (inngestErr: unknown) {
      console.error('Inngest error (non-fatal):', inngestErr instanceof Error ? inngestErr.message : inngestErr)
    }

    // Increment contributor photos_uploaded count atomically (best-effort)
    try {
      await supabaseAdmin.rpc('increment_contributor_photos_uploaded', {
        p_contributor_id: contributor.id,
      })
    } catch {
      // RPC may not exist — fallback to read-then-write
      const { data: current } = await supabaseAdmin
        .from('contributors')
        .select('photos_uploaded')
        .eq('id', contributor.id)
        .maybeSingle()
      await supabaseAdmin
        .from('contributors')
        .update({ photos_uploaded: (current?.photos_uploaded ?? 0) + 1 })
        .eq('id', contributor.id)
    }

    // Notify archive owner (best-effort)
    const archive = contributor.archives as { name: string; family_name: string; owner_email: string | null } | null
    if (archive?.owner_email) {
      const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'archive@basalith.xyz'

      resend.emails.send({
        from:    `${archive.name} <${fromEmail}>`,
        to:      archive.owner_email,
        subject: `${contributorName} uploaded a photograph to your archive`,
        html: `<!DOCTYPE html>
<html>
<body style="background:#0A0908;font-family:Georgia,serif;color:#F0EDE6;max-width:520px;margin:0 auto;padding:0">
  <div style="padding:40px 40px 0">
    <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#C4A24A;margin:0">
      ${archive.name.toUpperCase()}
    </p>
  </div>
  <div style="padding:32px 40px 40px">
    <p style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#F0EDE6;margin:0 0 16px">
      ${contributorName} added a photograph to your archive.
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#9DA3A8;line-height:1.7;margin:0 0 24px">
      It is being analyzed by AI. Once processed it will appear in your gallery.
    </p>
    <a href="${siteUrl}/archive/gallery" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#C4A24A;text-decoration:none">
      VIEW YOUR GALLERY →
    </a>
  </div>
</body>
</html>`,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, photographId: photo.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[contribute/register-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
