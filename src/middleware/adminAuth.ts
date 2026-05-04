import type { Context, Next } from 'hono';
import { AppError, ErrorCode } from '../lib/errors';

export async function adminAuthMiddleware(c: Context, next: Next) {
  const email = c.req.header('CF-Access-Authenticated-User-Email');
  if (!email) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  }
  c.set('adminEmail', email);
  await next();
}
