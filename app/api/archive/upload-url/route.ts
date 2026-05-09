import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getArchiveSession } from '@/lib/apiSecurity'

export const dynamic = 'force-dynamic'

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'])

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const session = await getArchiveSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { archiveId, fileName } = await req.json()

    if (!archiveId || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ensure the session owns this archive
    if (archiveId !== session.archiveId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Sanitize file name and validate extension ──────────────────────────
    const safeName = String(fileName).replace(/[/\\]/g, '_').replace(/\.{2,}/g, '_')
    const ext      = safeName.split('.').pop()?.toLowerCase() ?? ''

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, jpeg, png, webp, heic, heif, gif' },
        { status: 400 }
      )
    }

    const path = `${archiveId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

    const { data, error } = await supabaseAdmin
      .storage
      .from('photographs')
      .createSignedUploadUrl(path)

    if (error || !data) {
      console.error('[upload-url] error:', error?.message)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({ uploadUrl: data.signedUrl, token: data.token, path })

  } catch {
    return NextResponse.json({ error: 'Upload URL request failed' }, { status: 500 })
  }
}
