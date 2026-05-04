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

export function getImageUrl(env: { IMAGES_BASE_URL: string }, key: string): string {
  return `${env.IMAGES_BASE_URL}/${key}`;
}
