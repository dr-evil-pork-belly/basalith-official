import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const archiveId   = cookieStore.get('archive-id')?.value
  if (!archiveId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
