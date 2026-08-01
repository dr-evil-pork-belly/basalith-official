import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    console.log('=== CONTRIBUTE UPLOAD-URL ===')

    const body = await req.json()
    console.log('Body keys:', Object.keys(body))
    console.log('fileName:', body.fileName)

    const { token, fileName, fileType } = body

    if (!token || !fileName) {
      console.log('Missing token or fileName')
      return NextResponse.json({ error: 'token and fileName required' }, { status: 400 })
    }

    // Verify token directly — no utility function, no join
    const { data: contributor, error: contribError } = await supabaseAdmin
      .from('contributors')
      .select('id, name, archive_id, status')
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    console.log('Contributor found:', !!contributor, 'error:', contribError?.message ?? null)

    if (!contributor) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // The archive comes from the token row and from nowhere else. This used to
    // read `archiveId || contributor.archive_id`, so a body-supplied value won
    // over the archive the token actually belongs to, and a contributor holding
    // a valid token for one archive could mint a signed upload URL that writes
    // into another family's private bucket. The sibling route
    // app/api/contribute/upload-photo already derives it this way.
    //
    // The body value is deliberately not cross-checked against the token row. A
    // route that compares a caller-supplied archive id and errors on a mismatch
    // tells the caller whether that id is a real archive, which is the thing
    // worth hiding here.
    //
    // ContributeClient.tsx does not send archiveId on either call site. It reads
    // archiveId back off this response and forwards it to register-photo and
    // register-media, so the response field stays. If any caller does send the
    // field, it is now dead weight on the wire and changes nothing about which
    // prefix gets signed.
    const archiveId = contributor.archive_id as string
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin'

    const isVideo = (fileType?.startsWith('video/')) ||
      ['mov', 'mp4', 'm4v', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)
    const isDocument = !isVideo && (
      fileType?.includes('pdf') ||
      fileType?.includes('word') ||
      fileType?.startsWith('text/') ||
      ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)
    )
    const bucket = isVideo ? 'archive-videos' : isDocument ? 'archive-documents' : 'photographs'

    const path = `${archiveId}/${Date.now()}-contrib-${Math.random().toString(36).substring(2, 9)}.${ext}`

    console.log('[upload-url] fileType:', fileType)
    console.log('[upload-url] ext:', ext)
    console.log('[upload-url] isVideo:', isVideo)
    console.log('[upload-url] bucket:', bucket)
    console.log('[upload-url] path:', path)

    const { data, error: urlError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false })

    console.log('[upload-url] signedUrl created:', !!data?.signedUrl, urlError?.message)

    if (urlError || !data) {
      return NextResponse.json({ error: urlError?.message || 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      uploadUrl:  data.signedUrl,
      path,
      archiveId,
      bucket,
      isVideo,
      isDocument,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[contribute/upload-url]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
