import type { Context, Next } from 'hono';
import { AppError, ErrorCode } from '../lib/errors';

export async function adminAuthMiddleware(c: Context, next: Next) {
  const env = c.env as unknown as Env;

  // Prefer Cloudflare Access header when deployed behind it
  const email = c.req.header('CF-Access-Authenticated-User-Email');
  if (email) {
    c.set('adminEmail', email);
    await next();
    return;
  }

  // Fall back to HTTP Basic Auth using ADMIN_SECRET as password
  const auth = c.req.header('Authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const password = decoded.split(':').slice(1).join(':');
      if (password === env.ADMIN_SECRET) {
        c.set('adminEmail', 'admin');
        await next();
        return;
      }
    } catch { /* fall through */ }
  }

  throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
}
