import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { turnstileMiddleware } from '../middleware/turnstile';
import { generateUlid } from '../lib/ulid';
import { hashIp } from '../lib/privacy';
import { AppError, ErrorCode } from '../lib/errors';

const reportSchema = z.object({
  placeId: z.string().min(1),
  reason: z.string().max(500).optional(),
  'cf-turnstile-response': z.string().min(1),
});

export const reportsRouter = new Hono<{ Bindings: Env }>();

reportsRouter.post('/', turnstileMiddleware, zValidator('form', reportSchema), async (c) => {
  const { placeId, reason } = c.req.valid('form');
  const env = c.env;

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const salt = env.IP_HASH_SALT;
  const ipHash = await hashIp(ip, salt);

  const id = generateUlid();
  const created_at = new Date().toISOString();

  const result = await env.DB.prepare(
    'INSERT INTO reports (id, place_id, reason, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, placeId, reason ?? null, ipHash, created_at)
    .run();

  if (!result.success) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to save report', 500);
  }

  return c.json({ id }, 201);
});
