import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, fileName } = await req.json()
    if (!token || !fileName) {
      return NextResponse.json({ error: 'token and fileName required' }, { status: 400 })
    }

    const contributor = await getContributorByToken(token)
    if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const archiveId = contributor.archive_id as string
    const ext       = fileName.split('.').pop()?.toLowerCase() || 'jpg'
    const path      = `${archiveId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`

    const { data, error } = await supabaseAdmin
      .storage
      .from('photographs')
      .createSignedUploadUrl(path)

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create upload URL')
    }

    return NextResponse.json({ uploadUrl: data.signedUrl, path, archiveId })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[contribute/upload-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
