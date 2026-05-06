import { describe, it, expect } from 'vitest';
import { buildR2Key, getImageUrl } from './r2';

describe('buildR2Key', () => {
  it('builds the correct key pattern', () => {
    expect(buildR2Key('pending', '01HWXYZ', 'thumb', 'webp')).toBe('pending/01HWXYZ/thumb.webp');
  });

  it('works for approved status and modal variant', () => {
    expect(buildR2Key('approved', '01HWXYZ', 'modal', 'webp')).toBe('approved/01HWXYZ/modal.webp');
  });
});

describe('getImageUrl', () => {
  it('constructs the full image URL', () => {
    const env = { IMAGES_BASE_URL: 'https://images.localmatal.com' };
    expect(getImageUrl(env, 'approved/01HWXYZ/thumb.webp')).toBe(
      'https://images.localmatal.com/approved/01HWXYZ/thumb.webp',
    );
  });
});
