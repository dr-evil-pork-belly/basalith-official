import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    console.log('=== CONTRIBUTE UPLOAD-URL ===')

    const body = await req.json()
    console.log('Body keys:', Object.keys(body))
    console.log('token preview:', body.token?.substring(0, 10))
    console.log('fileName:', body.fileName)
    console.log('archiveId:', body.archiveId)

    const { token, fileName, archiveId } = body

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

    const resolvedArchiveId = archiveId || contributor.archive_id
    const ext  = fileName.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${resolvedArchiveId}/${Date.now()}-contrib-${Math.random().toString(36).substring(2, 9)}.${ext}`

    console.log('Creating signed URL for path:', path)

    const { data, error: urlError } = await supabaseAdmin
      .storage
      .from('photographs')
      .createSignedUploadUrl(path)

    console.log('Signed URL created:', !!data, 'error:', urlError?.message ?? null)

    if (urlError || !data) {
      return NextResponse.json({ error: urlError?.message || 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      uploadUrl:  data.signedUrl,
      path,
      archiveId:  resolvedArchiveId,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[contribute/upload-url]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
