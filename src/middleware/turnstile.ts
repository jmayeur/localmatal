import type { Context, Next } from 'hono';
import { AppError, ErrorCode } from '../lib/errors';

export async function turnstileMiddleware(c: Context, next: Next) {
  const env = c.env as unknown as Env;

  // Native iOS app: verified by a static shared secret instead of a browser CAPTCHA.
  // The key lives in a Wrangler secret (MOBILE_API_KEY) and in the app's xcconfig.
  const mobileKey = c.req.header('X-Mobile-Api-Key');
  if (mobileKey && env.MOBILE_API_KEY && mobileKey === env.MOBILE_API_KEY) {
    const body = await c.req.parseBody();
    c.set('parsedBody', body);
    await next();
    return;
  }

  const body = await c.req.parseBody();
  const token = body['cf-turnstile-response'] as string | undefined;
  const secretKey = env.TURNSTILE_SECRET_KEY;

  if (!token) {
    throw new AppError(ErrorCode.TURNSTILE_FAILED, 'Bot check failed', 400);
  }

  const ip = c.req.header('CF-Connecting-IP') ?? '';
  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (ip) formData.append('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const result = await res.json<{ success: boolean }>();
  if (!result.success) {
    throw new AppError(ErrorCode.TURNSTILE_FAILED, 'Bot check failed', 400);
  }

  // Re-attach parsed body for downstream handlers
  c.set('parsedBody', body);
  await next();
}
