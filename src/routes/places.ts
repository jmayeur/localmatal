import { Hono } from 'hono';
import { getPlaceById, getCurrentPlaceFromDb } from '../lib/db';
import { getCurrentPlace, setCurrentPlace } from '../lib/kv';
import { AppError, ErrorCode } from '../lib/errors';
import type { Place } from '../lib/db';

export const placesRouter = new Hono<{ Bindings: Env }>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPlace(place: Place) {
  return {
    id: place.id,
    place_name: place.place_name,
    contributor_name: place.contributor_name,
    sentence: place.sentence,
    lat: place.lat,
    lng: place.lng,
    // Normalise to the approved R2 prefix so clients can build image URLs directly.
    // The web app always reads images at approved/{id}/… regardless of what's stored.
    r2_key_prefix: place.r2_key_prefix ? `approved/${place.id}` : null,
    thumb_width: place.thumb_width,
    thumb_height: place.thumb_height,
    approved_at: place.approved_at,
  };
}

async function resolveChain(db: D1Database, placeId: string, prevPlaceId: string | null) {
  const nextRow = await db
    .prepare('SELECT id FROM places WHERE prev_place_id = ? AND is_tombstoned = 0 LIMIT 1')
    .bind(placeId)
    .first<{ id: string }>();
  return {
    previous_id: prevPlaceId,
    next_id: nextRow?.id ?? null,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/v1/places/current
// Returns the active place + chain links. Uses KV cache → D1 fallback.
placesRouter.get('/current', async (c) => {
  const env = c.env;

  const cached = await getCurrentPlace(env.CURRENT_PLACE_CACHE).catch(() => null);

  let place: Place | null = null;
  if (cached) {
    // Re-fetch from D1 to get prev_place_id for chain resolution
    place = await getPlaceById(env.DB, cached.id);
  } else {
    place = await getCurrentPlaceFromDb(env.DB);
    if (place?.r2_key_prefix) {
      await setCurrentPlace(env.CURRENT_PLACE_CACHE, {
        id: place.id,
        place_name: place.place_name,
        contributor_name: place.contributor_name,
        sentence: place.sentence,
        lat: place.lat,
        lng: place.lng,
        r2_key_prefix: place.r2_key_prefix,
        thumb_width: place.thumb_width,
        thumb_height: place.thumb_height,
        approved_at: place.approved_at,
      }).catch(() => {});
    }
  }

  if (!place) {
    throw new AppError(ErrorCode.NOT_FOUND, 'No current place', 404);
  }

  const chain = await resolveChain(env.DB, place.id, place.prev_place_id);

  return c.json({ place: formatPlace(place), chain });
});

// GET /api/v1/places/:id
placesRouter.get('/:id', async (c) => {
  const place = await getPlaceById(c.env.DB, c.req.param('id'));

  if (!place || place.is_tombstoned) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Place not found', 404);
  }

  const chain = await resolveChain(c.env.DB, place.id, place.prev_place_id);

  return c.json({ place: formatPlace(place), chain });
});

// GET /api/v1/places?page=1&page_size=24
placesRouter.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('page_size') ?? '24', 10)));
  const offset = (page - 1) * pageSize;

  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(
      'SELECT * FROM places WHERE is_tombstoned = 0 ORDER BY approved_at DESC LIMIT ? OFFSET ?',
    )
      .bind(pageSize, offset)
      .all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM places WHERE is_tombstoned = 0').first<{
      count: number;
    }>(),
  ]);

  const places = results.map((row) =>
    formatPlace({ ...row, is_tombstoned: row.is_tombstoned === 1 } as Place),
  );

  return c.json({
    places,
    total: totalRow?.count ?? 0,
    page,
    page_size: pageSize,
  });
});
