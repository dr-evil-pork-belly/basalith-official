/**
 * Photo URL helpers.
 *
 * Toggle between signed and public URLs by setting:
 *   PHOTOGRAPHS_BUCKET_PUBLIC=true  in your environment.
 *
 * To make the bucket public:
 *   Supabase → Storage → photographs → Edit bucket → toggle Public.
 *
 * Signed URLs: private but expire. Public URLs: permanent but anyone
 * with the URL can access the photo. Since photo URLs are already
 * distributed in emails to contributors, the security tradeoff is minimal.
 *
 * Rule:
 *   getEmailPhotoUrl()  — use for all emails (permanent or 1-year fallback)
 *   getInAppPhotoUrl()  — use for in-app display (short-lived, refreshed on reload)
 */

import { supabaseAdmin } from './supabase-admin'

const BUCKET = 'photographs'
const isPublic = process.env.PHOTOGRAPHS_BUCKET_PUBLIC === 'true'

// 1 year in seconds — long enough that emails remain readable for recipients
const EMAIL_EXPIRY = 60 * 60 * 24 * 365

export async function getEmailPhotoUrl(storagePath: string): Promise<string | null> {
  if (isPublic) {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
    return data.publicUrl ?? null
  }
  const { data } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, EMAIL_EXPIRY)
  return data?.signedUrl ?? null
}

export async function getInAppPhotoUrl(
  storagePath: string,
  expirySeconds = 3600,
): Promise<string | null> {
  if (isPublic) {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
    return data.publicUrl ?? null
  }
  const { data } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expirySeconds)
  return data?.signedUrl ?? null
}

/** Bulk version — batches parallel URL generation for gallery-style pages. */
export async function getInAppPhotoUrls(
  photos: { id: string; storage_path: string | null }[],
  expirySeconds = 3600,
): Promise<Record<string, string>> {
  const results = await Promise.all(
    photos.map(async p => {
      if (!p.storage_path) return [p.id, null] as const
      const url = await getInAppPhotoUrl(p.storage_path, expirySeconds)
      return [p.id, url] as const
    })
  )
  return Object.fromEntries(results.filter(([, url]) => url !== null)) as Record<string, string>
}
