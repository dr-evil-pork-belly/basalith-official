import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')

  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .storage
    .from('photographs')
    .createSignedUrl(path, 3600) // valid for 1 hour

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
