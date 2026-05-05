import { Hono } from 'hono';
import { z } from 'zod';
import { AppError, ErrorCode } from '../lib/errors';
import { turnstileMiddleware } from '../middleware/turnstile';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { processAndStoreImage, deleteR2Prefix } from '../lib/imageProcessor';
import { runSafetyChecks } from '../lib/ai';
import { checkConceptOverlap } from '../lib/conceptOverlap';
import { getCurrentPlaceFromDb } from '../lib/db';
import { fuzzCoordinates, hashIp } from '../lib/privacy';
import { generateUlid } from '../lib/ulid';
import { notifyMaintainerFireAndForget } from '../lib/email';

export const submissionsRouter = new Hono<{ Bindings: Env }>();

submissionsRouter.post(
  '/',
  turnstileMiddleware,
  rateLimitMiddleware,
  async (c) => {
    const env = c.env as Env;

    // Guard: submissions paused
    if (env.SUBMISSIONS_PAUSED === 'true') {
      throw new AppError(ErrorCode.SUBMISSIONS_PAUSED, 'Submissions are temporarily paused', 503);
    }

    const body: Record<string, unknown> = (c.get as (key: string) => unknown)('parsedBody') as Record<string, unknown> ?? await c.req.parseBody();

    // Bot traps
    const honeypot = (body['website'] as string) ?? '';
    const timeOnForm = parseInt((body['time_on_form'] as string) ?? '0', 10);
    if (honeypot.length > 0 || timeOnForm < 3000) {
      throw new AppError(ErrorCode.BOT_DETECTED, 'Submission rejected', 400);
    }

    // Validate text fields
    const textSchema = z.object({
      place_name: z.string().min(1).max(100),
      contributor_name: z.string().min(1).max(80),
      sentence: z.string().min(1).max(250),
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    });
    const parsed = textSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      throw new AppError(ErrorCode.INTERNAL_ERROR, first.message, 400, first.path[0] as string);
    }
    const { place_name, contributor_name, sentence, lat, lng } = parsed.data;

    // Photo file
    const photo = body['photo'] as File | undefined;
    if (!photo || !(photo instanceof File)) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Photo is required', 400, 'photo');
    }

    // Concept overlap check against current place
    const currentPlace = await getCurrentPlaceFromDb(env.DB);
    let overlapScore: number | null = null;
    let overlapDegraded = false;
    if (currentPlace) {
      const overlap = await checkConceptOverlap(env.AI, env, sentence, currentPlace.sentence);
      overlapScore = overlap.score;
      overlapDegraded = overlap.degraded;
      if (!overlap.passed && !overlap.degraded) {
        return c.json(
          {
            error: {
              code: ErrorCode.CONCEPT_OVERLAP_FAILED,
              message: 'Your sentence must connect with the previous one.',
              field: 'sentence',
            },
            currentSentence: currentPlace.sentence,
            overlapScore: overlap.score,
          },
          422,
        );
      }
    }

    const ulid = generateUlid();

    // Process and store image
    const imageResult = await processAndStoreImage(env.MEDIA, ulid, photo);

    // AI safety checks on the stored image
    let faceScore: number | null = null;
    let nsfwScore: number | null = null;
    let aiUnavailable = false;

    try {
      const fullKey = `${imageResult.r2KeyPrefix}/full.jpeg`;
      const obj = await env.MEDIA.get(fullKey) ?? await env.MEDIA.get(`${imageResult.r2KeyPrefix}/full.webp`);
      if (obj) {
        const bytes = new Uint8Array(await obj.arrayBuffer());
        const scores = await runSafetyChecks(env.AI, env, bytes);
        faceScore = scores.faceScore;
        nsfwScore = scores.nsfwScore;
        aiUnavailable = scores.unavailable;

        const FACE_THRESHOLD = 0.85;
        const NSFW_THRESHOLD = 0.7;
        if (
          !aiUnavailable &&
          ((faceScore !== null && faceScore >= FACE_THRESHOLD) ||
            (nsfwScore !== null && nsfwScore >= NSFW_THRESHOLD))
        ) {
          await deleteR2Prefix(env.MEDIA, imageResult.r2KeyPrefix);
          throw new AppError(ErrorCode.CONTENT_REJECTED, 'Photo could not be accepted', 400);
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // AI call failed entirely — flag and continue for manual review
      aiUnavailable = true;
      console.error('AI safety check error:', err);
    }

    // Privacy: fuzz coordinates, hash IP
    const fuzzed = fuzzCoordinates(lat, lng, 100);
    const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';
    const today = new Date().toISOString().slice(0, 10);
    const ipHash = await hashIp(ip, (env.IP_HASH_SALT ?? '') + today);

    // Insert submission
    await env.DB.prepare(
      `INSERT INTO submissions
         (id, place_name, contributor_name, sentence, lat, lng, r2_key_prefix,
          thumb_width, thumb_height, face_score, nsfw_score, overlap_score,
          ai_flags_unavailable, overlap_degraded, status, ip_hash, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
      .bind(
        ulid,
        place_name,
        contributor_name,
        sentence,
        fuzzed.lat,
        fuzzed.lng,
        imageResult.r2KeyPrefix,
        imageResult.thumbWidth,
        imageResult.thumbHeight,
        faceScore,
        nsfwScore,
        overlapScore,
        aiUnavailable ? 1 : 0,
        overlapDegraded ? 1 : 0,
        ipHash,
        new Date().toISOString(),
      )
      .run();

    // Notify maintainer — fire and forget
    const proto = c.req.header('X-Forwarded-Proto') ?? 'https';
    const host = c.req.header('Host') ?? 'localmatal.com';
    notifyMaintainerFireAndForget(env, ulid, `${proto}://${host}`);

    return c.json({ id: ulid, status: 'pending' }, 201);
  },
);
