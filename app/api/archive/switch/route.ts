import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { archiveId, role } = body as { archiveId?: string; role?: string }

    if (!archiveId || !role) {
      return NextResponse.json({ error: 'archiveId and role are required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const currentArchiveId = cookieStore.get('archive-id')?.value

    if (!currentArchiveId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Resolve the current archive's email to verify the switch is legitimate
    const { data: currentArchive } = await supabaseAdmin
      .from('archives')
      .select('email')
      .eq('id', currentArchiveId)
      .single()

    const email = currentArchive?.email
    if (!email) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401 })
    }

    // Verify the target archive belongs to this email
    if (role === 'owner') {
      const { data } = await supabaseAdmin
        .from('archives')
        .select('id')
        .eq('id', archiveId)
        .eq('email', email)
        .single()
      if (!data) {
        return NextResponse.json({ error: 'Archive not found' }, { status: 403 })
      }
    } else {
      const { data } = await supabaseAdmin
        .from('contributors')
        .select('id')
        .eq('archive_id', archiveId)
        .eq('email', email)
        .single()
      if (!data) {
        return NextResponse.json({ error: 'Archive not found' }, { status: 403 })
      }
    }

    const cookieOptions = {
      httpOnly: true,
      secure:   true,
      sameSite: 'strict' as const,
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    }

    cookieStore.set('archive-id',   archiveId, cookieOptions)
    cookieStore.set('archive-auth', archiveId, cookieOptions)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('[archive/switch] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
