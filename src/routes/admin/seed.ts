import { Hono } from 'hono';
import { z } from 'zod';
import { AppError, ErrorCode } from '../../lib/errors';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import { processAndStoreImage, deleteR2Prefix } from '../../lib/imageProcessor';
import { moveR2Prefix } from '../../lib/r2';
import { runSafetyChecks } from '../../lib/ai';
import {
  insertPlace,
  updateCurrentPlace,
  insertAuditLog,
  getCurrentPlaceFromDb,
} from '../../lib/db';
import { fuzzCoordinates } from '../../lib/privacy';
import { encodeGeohash } from '../../lib/geohash';
import { generateUlid } from '../../lib/ulid';
import { invalidateCurrentPlace } from '../../lib/kv';

export const seedRouter = new Hono<{ Bindings: Env }>();

seedRouter.use('*', adminAuthMiddleware);

seedRouter.post('/', async (c) => {
  const body = await c.req.parseBody();

  const schema = z.object({
    place_name: z.string().min(1).max(100),
    contributor_name: z.string().min(1).max(80),
    sentence: z.string().min(1).max(250),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new AppError(ErrorCode.INTERNAL_ERROR, first.message, 400, first.path[0] as string);
  }
  const { place_name, contributor_name, sentence, lat, lng } = parsed.data;

  const photo = body['photo'] as File | undefined;
  if (!photo || !(photo instanceof File)) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Photo is required', 400, 'photo');
  }

  const ulid = generateUlid();
  const imageResult = await processAndStoreImage(c.env.MEDIA, ulid, photo);

  // AI safety checks (same as public submission pipeline)
  try {
    const variants = ['full.jpeg', 'full.webp'];
    let obj = null;
    for (const v of variants) {
      obj = await c.env.MEDIA.get(`${imageResult.r2KeyPrefix}/${v}`);
      if (obj) break;
    }
    if (obj) {
      const bytes = new Uint8Array(await obj.arrayBuffer());
      const scores = await runSafetyChecks(c.env.AI, c.env, bytes);
      const FACE_THRESHOLD = 0.85;
      const NSFW_THRESHOLD = 0.7;
      if (
        !scores.unavailable &&
        ((scores.faceScore !== null && scores.faceScore >= FACE_THRESHOLD) ||
          (scores.nsfwScore !== null && scores.nsfwScore >= NSFW_THRESHOLD))
      ) {
        await deleteR2Prefix(c.env.MEDIA, imageResult.r2KeyPrefix);
        throw new AppError(ErrorCode.CONTENT_REJECTED, 'Photo could not be accepted', 400);
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('Seed AI check error (continuing):', err);
  }

  // Move to approved prefix immediately
  const approvedPrefix = `approved/${ulid}`;
  await moveR2Prefix(c.env.MEDIA, imageResult.r2KeyPrefix, approvedPrefix);

  const fuzzed = fuzzCoordinates(lat, lng, 100);
  const geohash6 = encodeGeohash(fuzzed.lat, fuzzed.lng, 6);
  const now = new Date().toISOString();
  const currentPlace = await getCurrentPlaceFromDb(c.env.DB);

  await insertPlace(c.env.DB, {
    id: ulid,
    prev_place_id: currentPlace?.id ?? null,
    place_name,
    contributor_name,
    sentence,
    lat: fuzzed.lat,
    lng: fuzzed.lng,
    location_fuzz_m: 100,
    geohash6,
    r2_key_prefix: approvedPrefix,
    thumb_width: imageResult.thumbWidth,
    thumb_height: imageResult.thumbHeight,
    created_at: now,
    approved_at: now,
  });
  await updateCurrentPlace(c.env.DB, ulid);
  await invalidateCurrentPlace(c.env.CURRENT_PLACE_CACHE);

  const actor = c.req.header('CF-Access-Authenticated-User-Email') ?? 'admin';
  await insertAuditLog(c.env.DB, {
    id: generateUlid(),
    action: 'seed',
    actor,
    subject_id: ulid,
    details: null,
    created_at: now,
  });

  return c.json({ id: ulid, status: 'approved' }, 201);
});
