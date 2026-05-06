import type { Context, Next } from 'hono';
import { AppError, ErrorCode } from '../lib/errors';
import { getAdminEmail } from '../lib/adminAuth';

export async function adminAuthMiddleware(c: Context, next: Next) {
  const env = c.env as unknown as Env;
  const email = await getAdminEmail(c.req.raw, env);
  if (!email) throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  c.set('adminEmail', email);
  await next();
}
