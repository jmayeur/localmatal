import { describe, it, expect } from 'vitest';
import { hashIp, fuzzCoordinates } from './privacy';

describe('hashIp', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await hashIp('192.168.1.1', 'testsalt');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same ip + salt produces same hash (deterministic)', async () => {
    const a = await hashIp('10.0.0.1', 'salt');
    const b = await hashIp('10.0.0.1', 'salt');
    expect(a).toBe(b);
  });

  it('different salts produce different hashes', async () => {
    const a = await hashIp('10.0.0.1', 'salt1');
    const b = await hashIp('10.0.0.1', 'salt2');
    expect(a).not.toBe(b);
  });
});

describe('fuzzCoordinates', () => {
  it('never returns exact original coordinates', () => {
    const lat = 51.5074;
    const lng = -0.1278;
    const { lat: fLat, lng: fLng } = fuzzCoordinates(lat, lng, 100);
    expect(fLat === lat && fLng === lng).toBe(false);
  });

  it('offsets by at least fuzzMeters', () => {
    const lat = 40.7128;
    const lng = -74.006;
    const fuzzM = 100;
    for (let i = 0; i < 20; i++) {
      const { lat: fLat, lng: fLng } = fuzzCoordinates(lat, lng, fuzzM);
      // Convert to approximate meters (rough check)
      const dLat = Math.abs(fLat - lat) * 111_000;
      const dLng = Math.abs(fLng - lng) * 111_000 * Math.cos((lat * Math.PI) / 180);
      const dist = Math.sqrt(dLat ** 2 + dLng ** 2);
      expect(dist).toBeGreaterThanOrEqual(fuzzM * 0.9); // 10% tolerance for floating point
    }
  });
});
