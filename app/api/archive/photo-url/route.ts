import { NextRequest, NextResponse } from 'next/server'
import { getInAppPhotoUrl } from '@/lib/photo-url'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')

  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  const url = await getInAppPhotoUrl(path, 3600) // 1 hour for in-app display

  if (!url) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url })
}
