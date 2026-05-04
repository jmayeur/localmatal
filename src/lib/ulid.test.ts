import { describe, it, expect } from 'vitest';
import { generateUlid } from './ulid';

describe('generateUlid', () => {
  it('returns a 26-character string', () => {
    expect(generateUlid()).toHaveLength(26);
  });

  it('returns only Crockford base32 characters', () => {
    const ulid = generateUlid();
    expect(ulid).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
  });

  it('produces unique values on successive calls', () => {
    const a = generateUlid();
    const b = generateUlid();
    expect(a).not.toBe(b);
  });

  it('is lexicographically sortable (later call is >=)', async () => {
    const a = generateUlid();
    await new Promise((r) => setTimeout(r, 2));
    const b = generateUlid();
    expect(b >= a).toBe(true);
  });
});
