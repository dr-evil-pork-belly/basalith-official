import { supabaseAdmin } from './supabase-admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://basalith.xyz'

/**
 * Returns a permanent proxy URL for a photograph by ID.
 * Use for ALL emails — this URL never expires.
 * /api/photos/[photoId] generates a fresh signed URL on each image load,
 * keeping the photographs bucket private while email images always work.
 */
export function getEmailPhotoUrl(photoId: string): string {
  return `${SITE_URL}/api/photos/${photoId}`
}

/**
 * Generates a short-lived signed URL for in-app display (portal/gallery).
 * Valid for expiresIn seconds (default 1 hour). Refreshes on each page load.
 */
export async function getInAppPhotoUrl(
  storagePath: string,
  expiresIn   = 3600,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .storage
    .from('photographs')
    .createSignedUrl(storagePath, expiresIn)
  return data?.signedUrl ?? null
}

/**
 * Batch signed URL generation for gallery and similar list views.
 */
export async function getInAppPhotoUrls(
  photos:    { id: string; storage_path: string | null }[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    photos
      .filter(p => p.storage_path)
      .map(async p => {
        const url = await getInAppPhotoUrl(p.storage_path!, expiresIn)
        return url ? ([p.id, url] as [string, string]) : null
      })
  )
  return Object.fromEntries(entries.filter((e): e is [string, string] => e !== null))
}
