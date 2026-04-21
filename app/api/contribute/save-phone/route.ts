import { NextRequest, NextResponse } from 'next/server'
import { getContributorByToken } from '@/lib/contributorToken'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, phone } = await req.json()
    if (!token || !phone?.trim()) {
      return NextResponse.json({ error: 'token and phone required' }, { status: 400 })
    }

    const contributor = await getContributorByToken(token)
    if (!contributor) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { error } = await supabaseAdmin
      .from('contributors')
      .update({ phone: phone.trim() })
      .eq('id', contributor.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
