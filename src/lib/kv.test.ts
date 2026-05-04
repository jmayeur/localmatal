/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect, beforeEach } from 'vitest';
import { env as rawEnv } from 'cloudflare:test';

const env = rawEnv as unknown as Env;
import { getCurrentPlace, setCurrentPlace, invalidateCurrentPlace } from './kv';

describe('KV current place cache', () => {
  beforeEach(async () => {
    await env.CURRENT_PLACE_CACHE.delete('current');
  });

  it('returns null on cache miss', async () => {
    const result = await getCurrentPlace(env.CURRENT_PLACE_CACHE);
    expect(result).toBeNull();
  });

  it('returns the cached place after set', async () => {
    const place = {
      id: '01HWXYZ',
      place_name: 'The Old Oak',
      contributor_name: 'Alice',
      sentence: 'Light pours through its upper branches at dusk.',
      lat: 51.5074,
      lng: -0.1278,
      r2_key_prefix: 'approved/01HWXYZ',
      thumb_width: 400,
      thumb_height: 300,
      approved_at: '2026-01-01T00:00:00.000Z',
    };
    await setCurrentPlace(env.CURRENT_PLACE_CACHE, place);
    const cached = await getCurrentPlace(env.CURRENT_PLACE_CACHE);
    expect(cached).toEqual(place);
  });

  it('returns null after invalidation', async () => {
    await env.CURRENT_PLACE_CACHE.put('current', '{"id":"x"}');
    await invalidateCurrentPlace(env.CURRENT_PLACE_CACHE);
    const result = await getCurrentPlace(env.CURRENT_PLACE_CACHE);
    expect(result).toBeNull();
  });
});
