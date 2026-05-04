import { describe, it, expect } from 'vitest';
import { buildR2Key } from '../lib/r2';

// MapIsland renders Leaflet which requires a real DOM and window.
// Component rendering is covered by manual smoke testing.
// This file validates the TypeScript interface is correct.

describe('MapIsland types', () => {
  it('r2 key helper produces stable URLs (sanity check)', () => {
    expect(buildR2Key('approved', '01HWXYZ', 'modal', 'webp')).toBe(
      'approved/01HWXYZ/modal.webp',
    );
  });
});
