import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/getSessionUser'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Auth: Supabase owner session only. Ownership is verified against the
  // archives table — a session carrying an archiveId is not proof of ownership
  // (getSessionUser fills archiveId for successors too).
  const session = await getSessionUser()
  if (!session?.archiveId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const archiveId = session.archiveId

  const { data: ownerRow } = await supabaseAdmin
    .from('archives')
    .select('owner_user_id')
    .eq('id', archiveId)
    .maybeSingle()
  if (!ownerRow || ownerRow.owner_user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { birthYear } = await req.json()

  const parsedYear = birthYear ? parseInt(String(birthYear)) : null
  if (parsedYear !== null && (parsedYear < 1900 || parsedYear > new Date().getFullYear())) {
    return NextResponse.json({ error: 'Invalid birth year' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('archives')
    .update({
      owner_birth_year:   parsedYear,
      owner_birth_decade: parsedYear ? Math.floor(parsedYear / 10) * 10 : null,
    })
    .eq('id', archiveId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
