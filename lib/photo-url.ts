/**
 * Thin wrappers kept for backward-compatibility with routes updated in the
 * previous pass. Both helpers now return permanent public URLs via getPhotoUrl().
 * The photographs bucket is public — signed URLs are no longer needed.
 */

import { getPhotoUrl } from './storage'

export async function getEmailPhotoUrl(storagePath: string): Promise<string | null> {
  return getPhotoUrl(storagePath)
}

export async function getInAppPhotoUrl(
  storagePath: string,
  _expirySeconds?: number,
): Promise<string | null> {
  return getPhotoUrl(storagePath)
}

export async function getInAppPhotoUrls(
  photos: { id: string; storage_path: string | null }[],
  _expirySeconds?: number,
): Promise<Record<string, string>> {
  return Object.fromEntries(
    photos
      .filter(p => p.storage_path)
      .map(p => [p.id, getPhotoUrl(p.storage_path!)])
  )
}
