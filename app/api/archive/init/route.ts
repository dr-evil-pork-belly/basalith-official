import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { name, familyName, ownerEmail, tier } = await req.json()

    const { data, error } = await supabaseAdmin
      .from('archives')
      .insert({
        name:        name || `The ${familyName} Archive`,
        family_name: familyName,
        owner_email: ownerEmail,
        tier:        tier || 'estate',
        generation:  'Generation I',
        status:      'active',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, archiveId: data.id, archive: data })
  } catch (err) {
    console.error('[archive/init]', err)
    return NextResponse.json({ error: 'Failed to create archive' }, { status: 500 })
  }
}
