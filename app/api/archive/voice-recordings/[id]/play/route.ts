import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch the recording to get storage path
    const { data: recording, error: fetchError } = await supabaseAdmin
      .from('voice_recordings')
      .select('storage_path, archive_id')
      .eq('id', id)
      .single()

    if (fetchError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    // Create 1-hour signed URL
    const { data: signed, error: signError } = await supabaseAdmin
      .storage
      .from('voice-recordings')
      .createSignedUrl(recording.storage_path, 3600)

    if (signError || !signed?.signedUrl) {
      throw new Error(signError?.message || 'Failed to create signed URL')
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Voice recording play error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
