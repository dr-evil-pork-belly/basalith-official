import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, title, year, category, location, people, contributor, labeledAt } = body

    // Log to console for now — wire to DB when ready
    console.log('[archive/save]', { id, title, year, category, location, labeledAt })

    return NextResponse.json({
      success:      true,
      photographId: id,
      archiveDepth: body.archiveDepth ?? null,
      streak:       body.streak       ?? null,
    })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
