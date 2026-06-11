import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { archiveId, role } = body as { archiveId?: string; role?: string }

    if (!archiveId || !role) {
      return NextResponse.json({ error: 'archiveId and role are required' }, { status: 400 })
    }

    // Verify the target archive belongs to this session
    if (role === 'owner') {
      const { data } = await supabaseAdmin
        .from('archives')
        .select('id')
        .eq('id', archiveId)
        .eq('owner_user_id', session.userId)
        .single()
      if (!data) {
        return NextResponse.json({ error: 'Archive not found' }, { status: 403 })
      }
    } else {
      // Contributor access is matched by email, not by session scope.
      const { data } = await supabaseAdmin
        .from('contributors')
        .select('id')
        .eq('archive_id', archiveId)
        .eq('email', session.email)
        .single()
      if (!data) {
        return NextResponse.json({ error: 'Archive not found' }, { status: 403 })
      }
    }

    // Record which archive is "active" for this session, used to disambiguate
    // owners of more than one archive (see lib/auth/getSessionUser.ts).
    const cookieStore = await cookies()
    cookieStore.set('archive-id', archiveId, {
      httpOnly: true,
      secure:   true,
      sameSite: 'strict' as const,
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('[archive/switch] error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
