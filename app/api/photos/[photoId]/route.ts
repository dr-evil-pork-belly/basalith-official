import { supabaseAdmin } from '@/lib/supabase-admin'

// Image proxy for photographs stored in the private bucket.
// Intentionally unauthenticated — photo IDs are UUIDs (unguessable).
// Anyone who received the email already has legitimate access to this image.
// This is the same approach used by Gmail, Notion, and Linear for media in emails.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await params

  if (!photoId || photoId.length < 32) {
    return new Response('Not found', { status: 404 })
  }

  const { data: photo } = await supabaseAdmin
    .from('photographs')
    .select('storage_path')
    .eq('id', photoId)
    .maybeSingle()

  if (!photo?.storage_path) {
    return new Response('Not found', { status: 404 })
  }

  const { data: signed } = await supabaseAdmin
    .storage
    .from('photographs')
    .createSignedUrl(photo.storage_path, 3600) // 1 hour — refreshed on each email open

  if (!signed?.signedUrl) {
    return new Response('Could not generate URL', { status: 500 })
  }

  return new Response(null, {
    status:  302,
    headers: {
      'Location':      signed.signedUrl,
      'Cache-Control': 'private, max-age=3600',
      'X-Photo-Id':    photoId,
    },
  })
}
