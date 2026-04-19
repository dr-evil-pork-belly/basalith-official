import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function validateGodAuth(req: NextRequest): boolean {
  const cookie   = req.cookies.get('god-mode-auth')?.value
  const expected = process.env.GOD_MODE_PASSWORD || process.env.CRON_SECRET || ''
  return !!expected && cookie === expected
}

export async function POST(req: NextRequest) {
  if (!validateGodAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { archiveId } = await req.json()
    if (!archiveId) {
      return NextResponse.json({ error: 'archiveId required' }, { status: 400 })
    }

    const { data: archive } = await supabaseAdmin
      .from('archives')
      .select('id, name, status')
      .eq('id', archiveId)
      .maybeSingle()

    if (!archive) {
      return NextResponse.json({ error: 'Archive not found' }, { status: 404 })
    }

    const cookieOptions = {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge:   60 * 60 * 4, // 4 hours
      path:     '/',
    }

    const res = NextResponse.json({ success: true, archiveName: archive.name })
    res.cookies.set('archive-auth', archiveId, cookieOptions)
    res.cookies.set('archive-id',   archiveId, cookieOptions)
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
