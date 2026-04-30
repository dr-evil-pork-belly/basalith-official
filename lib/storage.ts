import { supabaseAdmin } from './supabase-admin'

/**
 * Constructs a permanent public URL for a file in the photographs bucket.
 * The photographs bucket must be set to public in Supabase.
 * Zero API call — URL is built directly from the project URL.
 */
export function getPhotoUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/photographs/${storagePath}`
}

/**
 * Generates a signed URL for a private bucket (voice-recordings, archive-videos, etc.).
 * Not used for photographs.
 */
export async function getSignedUrl(
  bucket: string,
  storagePath: string,
  expiresIn: number = 3600,
): Promise<string | null> {
  const { data } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)
  return data?.signedUrl ?? null
}
