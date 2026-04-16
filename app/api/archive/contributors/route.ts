import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const archiveId = searchParams.get('archiveId')
  if (!archiveId) return NextResponse.json({ error: 'archiveId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('contributors')
    .select('id, name, email, role, status, photos_labelled, created_at')
    .eq('archive_id', archiveId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contributors: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { archiveId, name, email, role } = await req.json()
    if (!archiveId || !email) {
      return NextResponse.json({ error: 'archiveId and email required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('contributors')
      .upsert(
        { archive_id: archiveId, email: email.trim(), name: name?.trim() ?? null, role: role ?? null, status: 'active' },
        { onConflict: 'archive_id,email' },
      )
      .select('id, name, email, role, status, photos_labelled, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contributor: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { archiveId, contributorId } = await req.json()
    if (!archiveId || !contributorId) {
      return NextResponse.json({ error: 'archiveId and contributorId required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('contributors')
      .update({ status: 'inactive' })
      .eq('id', contributorId)
      .eq('archive_id', archiveId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
