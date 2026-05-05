import type { Context, Next } from 'hono';
import { AppError, ErrorCode } from '../lib/errors';
import { hashIp } from '../lib/privacy';
import { upsertRateLimit } from '../lib/db';

const WINDOW_SUBMISSIONS_PER_DAY = 3;

export async function rateLimitMiddleware(c: Context, next: Next) {
  const env = c.env as unknown as Env;
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dailySalt = env.IP_HASH_SALT + today;
  const ipHash = await hashIp(ip, dailySalt);
  const windowKey = `submit:${today}`;

  const count = await upsertRateLimit(env.DB, ipHash, windowKey);

  if (count > WINDOW_SUBMISSIONS_PER_DAY) {
    throw new AppError(ErrorCode.RATE_LIMITED, 'Too many submissions', 429);
  }

  c.set('ipHash', ipHash);
  await next();
}
