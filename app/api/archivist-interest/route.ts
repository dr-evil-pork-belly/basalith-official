import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[archivist-interest]', JSON.stringify(body, null, 2))
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
