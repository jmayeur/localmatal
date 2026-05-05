export type R2Status = 'pending' | 'approved';
export type R2Variant = 'thumb' | 'modal' | 'full';

export function buildR2Key(
  status: R2Status,
  ulid: string,
  variant: R2Variant,
  ext: string,
): string {
  return `${status}/${ulid}/${variant}.${ext}`;
}

// origin should be e.g. "https://localmatal.com" — used to build absolute URLs
// for OG tags and feeds. Falls back to the proxy path for img src attributes.
export function getImageUrl(
  env: { IMAGES_BASE_URL: string },
  key: string,
  origin?: string,
): string {
  // Use configured CDN domain when set (e.g. https://images.localmatal.com)
  if (env.IMAGES_BASE_URL) {
    return `${env.IMAGES_BASE_URL}/${key}`;
  }
  const base = origin ? `${origin}/api/v1/image` : '/api/v1/image';
  return `${base}/${key}`;
}

// Copy all objects under srcPrefix to dstPrefix, then delete originals.
export async function moveR2Prefix(
  media: R2Bucket,
  srcPrefix: string,
  dstPrefix: string,
): Promise<void> {
  const listed = await media.list({ prefix: srcPrefix + '/' });
  for (const obj of listed.objects) {
    const srcKey = obj.key;
    const dstKey = dstPrefix + '/' + srcKey.slice(srcPrefix.length + 1);
    const existing = await media.get(srcKey);
    if (existing) {
      await media.put(dstKey, existing.body, { httpMetadata: existing.httpMetadata });
    }
  }
  // Delete originals only after all copies succeed
  for (const obj of listed.objects) {
    await media.delete(obj.key);
  }
}
