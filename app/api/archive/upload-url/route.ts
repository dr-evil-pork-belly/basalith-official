import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { archiveId, fileName } = await req.json()

    if (!archiveId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ext  = fileName.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${archiveId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`

    const { data, error } = await supabaseAdmin
      .storage
      .from('photographs')
      .createSignedUploadUrl(path)

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create upload URL')
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token:     data.token,
      path,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('upload-url error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
