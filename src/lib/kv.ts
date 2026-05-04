const CURRENT_PLACE_KEY = 'current';

export interface CachedPlace {
  id: string;
  place_name: string;
  contributor_name: string;
  sentence: string;
  lat: number;
  lng: number;
  r2_key_prefix: string;
  thumb_width: number | null;
  thumb_height: number | null;
  approved_at: string;
}

export async function getCurrentPlace(kv: KVNamespace): Promise<CachedPlace | null> {
  const raw = await kv.get(CURRENT_PLACE_KEY, 'text');
  if (!raw) return null;
  return JSON.parse(raw) as CachedPlace;
}

export async function setCurrentPlace(kv: KVNamespace, place: CachedPlace): Promise<void> {
  await kv.put(CURRENT_PLACE_KEY, JSON.stringify(place));
}

export async function invalidateCurrentPlace(kv: KVNamespace): Promise<void> {
  await kv.delete(CURRENT_PLACE_KEY);
}
